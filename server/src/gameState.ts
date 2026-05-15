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

// カードコンテンツのサンプル（10種類程度）
const CARD_CONTENTS = [
  'エネルギーカード\n強力なエネルギーを放出する。移動力+2。',
  'バリアカード\n防御フィールドを展開する。ダメージを1回無効化。',
  'テレパシーカード\n相手の思考を読む。次の相手行動を先読みできる。',
  'ワープカード\n空間を歪めて瞬間移動する。任意のマスに移動。',
  '念動力カード\n物体を念力で動かす。隣接するコマを1マス移動させる。',
  'ヒーリングカード\n生命力を回復する。次のターン、追加行動が可能。',
  '幻覚カード\n幻影を生み出す。相手の行動を1回無効化。',
  'センサーカード\n周囲を索敵する。隣接する伏せカードの内容を確認。',
  '爆発カード\n周囲に爆発を起こす。隣接マスのコマをすべて宇宙港へ。',
  'シールドカード\n強固な盾を展開する。2ターン間、全攻撃を無効化。',
  'スピードカード\n超高速で移動する。このターン、もう1回移動できる。',
  'トラップカード\n罠を設置する。次に踏んだコマをその場に固定。',
];

// 初期ボードを生成する（6行×7列）
export function createInitialBoard(): Cell[][] {
  // カードのシャッフル
  const shuffledContents = [...CARD_CONTENTS].sort(() => Math.random() - 0.5);
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
        // カードが配置されるマス
        const content = shuffledContents[cardIndex % shuffledContents.length];
        cardIndex++;

        const card: CardData = {
          id: `card-${row}-${col}`,
          content,
          isFaceUp: false,
          isAmbush: false,
          ambushLabel: null,
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
  // 接続中のプレイヤー数から色インデックスを決める
  const colorIndex = state.players.length % PLAYER_COLORS.length;

  const player: Player = {
    id: playerId,      // 安定したUUID
    socketId,          // 現在のSocket.id
    name,
    faction: undefined,
    isHost,
    isApproved: isHost, // ホストは自動承認
    color: PLAYER_COLORS[colorIndex],
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

  // ボードのフィルタリング：待ち伏せ情報はevilのみに送信
  const filteredBoard = state.board.map((row) =>
    row.map((cell) => {
      if (!cell.card) return cell;

      return {
        ...cell,
        card: {
          ...cell.card,
          // evilは常に待ち伏せ情報が見える、lawはカードがオープンされた時のみ表示
          isAmbush: cell.card.isAmbush && (isEvil || cell.card.isFaceUp),
          ambushLabel: (isEvil || cell.card.isFaceUp) ? cell.card.ambushLabel : null,
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
