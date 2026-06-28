// Socket.ioの接続とゲーム状態管理のカスタムフック

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Faction } from '../types/game';

// localStorage のキー
const STORAGE_KEY = 'locke_board_player';

interface StoredPlayer {
  name: string;
  playerId: string;
}

// 保存済みプレイヤー情報を取得する
function getStoredPlayer(): StoredPlayer | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// プレイヤー情報をlocalStorageに保存する
function savePlayer(name: string, playerId: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, playerId }));
}

// Socket.ioのイベント型定義（クライアント側）
interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'error': (data: { message: string }) => void;
}

interface ClientToServerEvents {
  'player:join': (data: { name: string; playerId: string }) => void;
  'player:leave': () => void;
  'player:approve': (data: { playerId: string }) => void;
  'faction:assign': (data: { playerId: string; faction: Faction }) => void;
  'faction:done': () => void;
  'ambush:set': (data: { positions: Array<{ row: number; col: number }> }) => void;
  'ambush:done': () => void;
  'piece:move': (data: { playerId: string; row: number; col: number }) => void;
  'card:flip': (data: { row: number; col: number }) => void;
  'card:destroy': (data: { row: number; col: number }) => void;
  'card:restore': (data: { row: number; col: number }) => void;
  'game:restart': () => void;
  'game:end': () => void;
  'game:startBase': () => void;
  'keyPoint:set': (data: { positions: Array<{ row: number; col: number }> }) => void;
  'keyPoint:done': () => void;
  'baseCard:flip': (data: { row: number; col: number }) => void;
  'baseCard:destroy': (data: { row: number; col: number }) => void;
  'baseCard:restore': (data: { row: number; col: number }) => void;
}

interface UseSocketReturn {
  gameState: GameState | null;
  isConnected: boolean;
  errorMessage: string | null;
  // イベント送信関数
  joinGame: (name: string) => void;
  leaveGame: () => void;
  approvePlayer: (playerId: string) => void;
  assignFaction: (playerId: string, faction: Faction) => void;
  factionDone: () => void;
  setAmbush: (positions: Array<{ row: number; col: number }>) => void;
  ambushDone: () => void;
  movePiece: (playerId: string, row: number, col: number) => void;
  flipCard: (row: number, col: number) => void;
  destroyCard: (row: number, col: number) => void;
  restoreCard: (row: number, col: number) => void;
  restartGame: () => void;
  endGame: () => void;
  startBase: () => void;
  setKeyPoint: (positions: Array<{ row: number; col: number }>) => void;
  keyPointDone: () => void;
  flipBaseCard: (row: number, col: number) => void;
  destroyBaseCard: (row: number, col: number) => void;
  restoreBaseCard: (row: number, col: number) => void;
  clearError: () => void;
}

// HTTPSが使えない環境でも動作するUUID生成（crypto.randomUUID非対応時のフォールバック）
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useSocket(): UseSocketReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // socketをrefで管理して再レンダリングを防ぐ
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    // Socket.ioクライアントの初期化
    // 本番環境: フロントとバックが同一サーバーのため同じオリジンに接続
    // 開発環境: Viteは5173、サーバーは3001で別ポートのため直接指定
    const serverUrl = import.meta.env.PROD
      ? window.location.origin
      : `http://${window.location.hostname}:3001`;
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl);

    socketRef.current = socket;

    // 接続イベント
    socket.on('connect', () => {
      console.log('サーバーに接続しました:', socket.id);
      setIsConnected(true);

      // 保存済みのプレイヤー情報があれば自動的に再参加を試みる
      const stored = getStoredPlayer();
      if (stored) {
        console.log('保存済みプレイヤー情報で再参加:', stored.name);
        socket.emit('player:join', { name: stored.name, playerId: stored.playerId });
      }
    });

    // 切断イベント
    socket.on('disconnect', () => {
      console.log('サーバーから切断されました');
      setIsConnected(false);
    });

    // ゲーム状態の受信
    socket.on('game:state', (state: GameState) => {
      setGameState(state);
    });

    // エラーの受信
    socket.on('error', ({ message }) => {
      console.error('サーバーエラー:', message);
      setErrorMessage(message);
    });

    // クリーンアップ
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // プレイヤー参加（初回）
  const joinGame = useCallback((name: string) => {
    // 既存のplayerIdがあれば再利用、なければ新規生成
    const stored = getStoredPlayer();
    const playerId = stored?.playerId ?? generateUUID();
    savePlayer(name, playerId);
    socketRef.current?.emit('player:join', { name, playerId });
  }, []);

  // 自発的な退出（LOBBYフェーズのみ）
  const leaveGame = useCallback(() => {
    socketRef.current?.emit('player:leave');
    // localStorageを削除して再参加を新規扱いにする
    localStorage.removeItem('locke_board_player');
  }, []);

  // プレイヤー承認（ホストのみ）
  const approvePlayer = useCallback((playerId: string) => {
    socketRef.current?.emit('player:approve', { playerId });
  }, []);

  // 陣営割り当て（ホストのみ）
  const assignFaction = useCallback((playerId: string, faction: Faction) => {
    socketRef.current?.emit('faction:assign', { playerId, faction });
  }, []);

  // 陣営割り当て完了（ホストのみ）
  const factionDone = useCallback(() => {
    socketRef.current?.emit('faction:done');
  }, []);

  // 待ち伏せ設定（evilのみ）
  const setAmbush = useCallback((positions: Array<{ row: number; col: number }>) => {
    socketRef.current?.emit('ambush:set', { positions });
  }, []);

  // 待ち伏せ設定完了（evilのみ）
  const ambushDone = useCallback(() => {
    socketRef.current?.emit('ambush:done');
  }, []);

  // コマ移動
  const movePiece = useCallback((playerId: string, row: number, col: number) => {
    socketRef.current?.emit('piece:move', { playerId, row, col });
  }, []);

  // カードフリップ
  const flipCard = useCallback((row: number, col: number) => {
    socketRef.current?.emit('card:flip', { row, col });
  }, []);

  // 惑星編カード破壊
  const destroyCard = useCallback((row: number, col: number) => {
    socketRef.current?.emit('card:destroy', { row, col });
  }, []);

  // 惑星編カード破壊解除
  const restoreCard = useCallback((row: number, col: number) => {
    socketRef.current?.emit('card:restore', { row, col });
  }, []);

  // ゲームリスタート（ホストのみ）
  const restartGame = useCallback(() => {
    socketRef.current?.emit('game:restart');
  }, []);

  // ゲーム終了（ホストのみ・全プレイヤーリセット）
  const endGame = useCallback(() => {
    socketRef.current?.emit('game:end');
  }, []);

  // 秘密基地編へ移行（ホストのみ）
  const startBase = useCallback(() => {
    socketRef.current?.emit('game:startBase');
  }, []);

  // 重要拠点設定（evilのみ）
  const setKeyPoint = useCallback((positions: Array<{ row: number; col: number }>) => {
    socketRef.current?.emit('keyPoint:set', { positions });
  }, []);

  // 重要拠点設定完了（evilのみ）
  const keyPointDone = useCallback(() => {
    socketRef.current?.emit('keyPoint:done');
  }, []);

  // 秘密基地カードフリップ
  const flipBaseCard = useCallback((row: number, col: number) => {
    socketRef.current?.emit('baseCard:flip', { row, col });
  }, []);

  // 秘密基地カード破壊
  const destroyBaseCard = useCallback((row: number, col: number) => {
    socketRef.current?.emit('baseCard:destroy', { row, col });
  }, []);

  // 秘密基地カード破壊解除
  const restoreBaseCard = useCallback((row: number, col: number) => {
    socketRef.current?.emit('baseCard:restore', { row, col });
  }, []);

  // エラーメッセージのクリア
  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    gameState,
    isConnected,
    errorMessage,
    joinGame,
    leaveGame,
    approvePlayer,
    assignFaction,
    factionDone,
    setAmbush,
    ambushDone,
    movePiece,
    flipCard,
    destroyCard,
    restoreCard,
    restartGame,
    endGame,
    startBase,
    setKeyPoint,
    keyPointDone,
    flipBaseCard,
    destroyBaseCard,
    restoreBaseCard,
    clearError,
  };
}
