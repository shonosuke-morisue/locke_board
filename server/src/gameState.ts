// ゲーム状態の管理モジュール

import { ServerGameState, Player, Cell, CardData, Faction } from './types';

// プレイヤーコマの色プリセット（最大10人分）
const PLAYER_COLORS = [
  '#e74c3c', // 赤
  '#3498db', // 青
  '#2ecc71', // 緑
  '#f39c12', // オレンジ
  '#9b59b6', // 紫
  '#1abc9c', // ティール
  '#e91e63', // ピンク
  '#ff5722', // ディープオレンジ
  '#607d8b', // ブルーグレー
  '#795548', // ブラウン
];

// カード定義（名称・枚数・詳細テキスト）
const CARD_DEFINITIONS: Array<{ name: string; count: number; content: string }> = [
  { name: '[能力]巡洋艦',                  count: 1,  content: '' },
  { name: '[能力]手下',                    count: 2,  content: '' },
  { name: '[能力]ＥＳＰジャマーLv3',      count: 1,  content: '' },
  { name: '[能力]ＥＳＰジャマーLv4',      count: 1,  content: '' },
  { name: '[能力]ＥＳＰジャマーLv5',      count: 1,  content: '' },
  { name: '[能力]ＥＳＰフィールドLv3',    count: 1,  content: '' },
  { name: '[能力]ＥＳＰフィールドLv4',    count: 1,  content: '' },
  { name: '[能力]ＥＳＰフィールドLv5',    count: 1,  content: '' },
  { name: '[能力]エネルギースーツ',        count: 1,  content: '' },
  { name: '[能力]個人用パワードスーツLv4', count: 1,  content: '' },
  { name: '[能力]個人用パワードスーツLv5', count: 1,  content: '' },
  { name: '[能力]ニケ',                    count: 1,  content: '' },
  { name: '[能力]亜空間フィールド',        count: 1,  content: '' },
  { name: '[能力]ＥＳＰコントローラー',   count: 1,  content: '' },
  { name: '[能力]エネルギー吸収ボールLv3', count: 1,  content: '' },
  { name: '[能力]エネルギー吸収ボールLv4', count: 1,  content: '' },
  { name: '[能力]エネルギー吸収ボールLv5', count: 1,  content: '' },
  { name: '[能力]クローン',                count: 3,  content: '' },
  { name: '[能力]ジオイド弾',              count: 1,  content: '' },
  { name: '[能力]変身',                    count: 1,  content: '' },
  { name: '[能力]ラフノールの鏡Lv5',      count: 1,  content: '' },
  { name: '[能力]ラフノールの鏡Lv6',      count: 1,  content: '' },
  { name: '[能力]ラフノールの鏡Lv7',      count: 1,  content: '' },
  { name: '開拓地',                        count: 2,  content: '' },
  { name: '歓楽街',                        count: 2,  content: '' },
  { name: '工業地域',                      count: 2,  content: '' },
  { name: '住宅街',                        count: 2,  content: '' },
  { name: 'スラム街',                      count: 2,  content: '' },
  { name: '宇宙港',                        count: 6,  content: '' },
  { name: '逮捕',                          count: 4,  content: '' },
  { name: '戦闘発生',                      count: 10, content: '' },
  { name: 'トラップ',                      count: 3,  content: '' },
  { name: '情報入手',                      count: 13, content: '' },
  { name: '自分の正体露顕',               count: 2,  content: '' },
  { name: '他人の正体判明',               count: 4,  content: '' },
];

// デッキを展開する（枚数分カードを生成してシャッフル、計78枚）
function buildDeck(): Array<{ name: string; content: string }> {
  const deck: Array<{ name: string; content: string }> = [];
  for (const def of CARD_DEFINITIONS) {
    for (let i = 0; i < def.count; i++) {
      deck.push({ name: def.name, content: def.content });
    }
  }
  // Fisher-Yates シャッフル
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 初期ボードを生成する（6行×7列）
export function createInitialBoard(): Cell[][] {
  // 78枚デッキをシャッフルして先頭36枚をボードに配置
  const deck = buildDeck();
  let cardIndex = 0;

  const board: Cell[][] = [];

  for (let row = 0; row < 6; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < 7; col++) {
      if (col === 0) {
        // 宇宙港マス（カードなし）
        rowCells.push({
          row,
          col,
          isSpaceport: true,
          card: null,
        });
      } else {
        // デッキから1枚取り出してマスに配置
        const { name, content } = deck[cardIndex++];

        const card: CardData = {
          id: `card-${row}-${col}`,
          name,
          content,
          isFaceUp: false,
          isAmbush: false,
          ambushLabel: null,
          openedBy: null,
        };

        rowCells.push({
          row,
          col,
          isSpaceport: false,
          card,
        });
      }
    }
    board.push(rowCells);
  }

  return board;
}

// 初期ゲーム状態を生成する
export function createInitialGameState(): ServerGameState {
  return {
    phase: 'LOBBY',
    players: [],
    board: createInitialBoard(),
    ambushPositions: [],
  };
}

// 新しいプレイヤーを追加する
export function addPlayer(
  state: ServerGameState,
  socketId: string,
  name: string,
  playerId: string
): Player {
  const isHost = state.players.length === 0;
  // 既存プレイヤーが使っていない色を先頭から選ぶ
  const usedColors = new Set(state.players.map((p) => p.color));
  const color =
    PLAYER_COLORS.find((c) => !usedColors.has(c)) ?? PLAYER_COLORS[0];

  const player: Player = {
    id: playerId,      // 安定したUUID
    socketId,          // 現在のSocket.id
    name,
    faction: undefined,
    isHost,
    isApproved: isHost, // ホストは自動承認
    color,
    position: null,
    isConnected: true,
  };

  state.players.push(player);
  return player;
}

// 既存プレイヤーのSocket.idを更新して再接続処理を行う
export function reconnectPlayer(
  player: Player,
  newSocketId: string
): void {
  player.socketId = newSocketId;
  player.isConnected = true;
}

// プレイヤーを切断状態にする（リストからは削除しない）
export function disconnectPlayer(state: ServerGameState, socketId: string): void {
  const player = state.players.find((p) => p.socketId === socketId);
  if (player) {
    player.isConnected = false;
  }

  // ホストが切断した場合、接続中の次のプレイヤーをホストにする
  if (!state.players.some((p) => p.isHost && p.isConnected)) {
    const nextHost = state.players.find((p) => p.isConnected);
    if (nextHost) {
      // 元のホストからホスト権を外す
      state.players.forEach((p) => { p.isHost = false; });
      nextHost.isHost = true;
    }
  }
}

// プレイヤーが自発的に退出する（リストから削除し、ホストなら移譲する）
export function leaveGame(state: ServerGameState, socketId: string): void {
  const index = state.players.findIndex((p) => p.socketId === socketId);
  if (index === -1) return;

  const leavingPlayer = state.players[index];
  const wasHost = leavingPlayer.isHost;

  // プレイヤーをリストから削除
  state.players.splice(index, 1);

  // ホストが退出した場合、接続中の次のプレイヤー（承認済み優先）にホスト権を移譲
  if (wasHost && state.players.length > 0) {
    state.players.forEach((p) => { p.isHost = false; });
    const nextHost =
      state.players.find((p) => p.isConnected && p.isApproved) ??
      state.players.find((p) => p.isConnected) ??
      state.players[0];
    nextHost.isHost = true;
    // 新しいホストは自動承認
    nextHost.isApproved = true;
  }
}

// evilプレイヤーのソケットIDリストを取得する
export function getEvilPlayerIds(state: ServerGameState): string[] {
  return state.players
    .filter((p) => p.faction === 'evil')
    .map((p) => p.id);
}

// ゲームを終了する（プレイヤーも含めてすべてリセット）
export function endGame(state: ServerGameState): void {
  state.phase = 'LOBBY';
  state.board = createInitialBoard();
  state.ambushPositions = [];
  state.players = []; // 全プレイヤーを削除
}

// ゲームをリスタートする（フェーズをLOBBYに戻し、ボードをリセット）
export function restartGame(state: ServerGameState): void {
  state.phase = 'LOBBY';
  state.board = createInitialBoard();
  state.ambushPositions = [];

  // 切断中のプレイヤーを削除し、接続中のプレイヤーの状態をリセット
  state.players = state.players.filter((p) => p.isConnected);
  state.players.forEach((player) => {
    player.faction = undefined;
    player.isApproved = player.isHost; // ホストのみ自動承認
    player.position = null;
  });
}

// 指定したクライアント向けにゲーム状態をフィルタリングして送信用データを作成する
export function createFilteredGameState(
  state: ServerGameState,
  socketId: string
): import('./types').GameState {
  // socketId から対応するプレイヤーを検索（安定したidではなく現在のsocketIdで照合）
  const player = state.players.find((p) => p.socketId === socketId);
  const isEvil = player?.faction === 'evil';
  const playerId = player?.id ?? null;

  // ボードのフィルタリング：秘密情報を各プレイヤーの権限に応じて制限
  const filteredBoard = state.board.map((row) =>
    row.map((cell) => {
      if (!cell.card) return cell;

      const card = cell.card;
      const isAbilityCard = card.name.startsWith('[能力]');
      // 能力カードの名称・詳細は開いた本人のみ閲覧可能
      const canSeeAbilityContent = !isAbilityCard || card.openedBy === playerId;

      return {
        ...cell,
        card: {
          ...card,
          name:    canSeeAbilityContent ? card.name    : '',
          content: canSeeAbilityContent ? card.content : '',
          // evilは常に待ち伏せ情報が見える、goodはカードがオープンされた時のみ表示
          isAmbush: card.isAmbush && (isEvil || card.isFaceUp),
          ambushLabel: (isEvil || card.isFaceUp) ? card.ambushLabel : null,
        },
      };
    })
  );

  // 待ち伏せ設定済み数（evilのみ）
  const ambushSetCount = isEvil ? state.ambushPositions.length : 0;

  return {
    phase: state.phase,
    players: state.players,
    board: filteredBoard,
    myId: player?.id ?? socketId, // 安定したUUID（Player.id）を返す
    myFaction: player?.faction,
    ambushSetCount,
  };
}
