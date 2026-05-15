// ゲームの型定義（サーバー側）

export type Faction = 'good' | 'evil';
export type GamePhase = 'LOBBY' | 'FACTION_SETUP' | 'AMBUSH_SETUP' | 'PLAYING';

// プレイヤー情報
export interface Player {
  id: string;          // 安定したUUID（再接続しても変わらない）
  socketId: string;    // 現在のSocket.id（再接続のたびに更新）
  name: string;
  faction?: Faction;
  isHost: boolean;
  isApproved: boolean;
  color: string;       // コマの色
  position: { row: number; col: number } | null;
  isConnected: boolean; // 現在接続中かどうか
}

// カードデータ（サーバー内部用・isAmbushを実際に保持）
export interface CardData {
  id: string;
  name: string;            // カード名称
  content: string;         // カードの詳細テキスト
  isFaceUp: boolean;
  isAmbush: boolean;       // 実際の待ち伏せフラグ（サーバー内部管理用）
  ambushLabel: 'A' | 'B' | null; // 待ち伏せの識別ラベル
  openedBy: string | null; // カードを開いたプレイヤーのID（能力カードの秘密情報管理用）
}

// マス情報
export interface Cell {
  row: number;
  col: number;
  isSpaceport: boolean; // col === 0
  card: CardData | null;
}

// クライアントに送信するゲーム状態
export interface GameState {
  phase: GamePhase;
  players: Player[];
  board: Cell[][];   // 6×7
  myId: string;      // 自分のsocket.id
  myFaction?: Faction;
  ambushSetCount: number; // AMBUSH_SETUPフェーズで何箇所設定済みか（evilのみ）
}

// サーバー内部のゲーム状態（フィルタリング前の完全な状態）
export interface ServerGameState {
  phase: GamePhase;
  players: Player[];
  board: Cell[][];
  ambushPositions: Array<{ row: number; col: number }>;
}

// Socket.ioのイベント型定義
export interface ClientToServerEvents {
  // playerId はクライアント側で生成・保存する安定したUUID
  'player:join': (data: { name: string; playerId: string }) => void;
  'player:approve': (data: { playerId: string }) => void;
  'faction:assign': (data: { playerId: string; faction: Faction }) => void;
  'faction:done': () => void;
  'ambush:set': (data: { positions: Array<{ row: number; col: number }> }) => void;
  'ambush:done': () => void;
  'piece:move': (data: { playerId: string; row: number; col: number }) => void;
  'card:flip': (data: { row: number; col: number }) => void;
  'game:restart': () => void;
  'game:end': () => void;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'error': (data: { message: string }) => void;
}
