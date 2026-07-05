// ゲームの型定義（サーバー側）

export type Faction = 'good' | 'evil';
export type GamePhase = 'LOBBY' | 'FACTION_SETUP' | 'AMBUSH_SETUP' | 'PLAYING' | 'BASE_SETUP' | 'BASE_PLAYING';

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
  dealtCard?: { name: string; content: string } | null; // AMBUSH_SETUPで配布された能力カード（evilのみ・本人にのみ送信）
}

// カードデータ（サーバー内部用・isAmbushを実際に保持）
export interface CardData {
  id: string;
  name: string;            // カード名称
  content: string;         // カードの詳細テキスト
  isAbility: boolean;      // 能力カードかどうか
  isFaceUp: boolean;
  isAmbush: boolean;       // 実際の待ち伏せフラグ（サーバー内部管理用）
  ambushLabel: 'A' | 'B' | null; // 待ち伏せの識別ラベル
  openedBy: string | null; // カードを開いて獲得したgoodプレイヤーのID（goodのフリップ時のみ記録・能力カードの秘密情報管理用）
  isDestroyed: boolean;    // 破壊状態（秘密基地カード用）
  isKeyPoint: boolean;     // 重要拠点カードかどうか
  keyPointLabel: string | null; // 重要拠点のラベル（エネルギー・ルーム等）
}

// マス情報
export interface Cell {
  row: number;
  col: number;
  isSpaceport: boolean; // col === 0
  card: CardData | null;
}

// ダイス（2個）の状態。サーバーが生成し全クライアントへ同期する公開情報
export interface DiceState {
  values: [number, number];     // 各サイコロの目（1〜6）
  rolledByName: string | null;  // 最後にロールしたプレイヤー名
  rollId: number;               // ロールごとに増えるカウンタ（アニメーション検知用）
}

// クライアントに送信するゲーム状態
export interface GameState {
  phase: GamePhase;
  players: Array<Omit<Player, 'socketId'>>; // サーバー内部のsocketIdは送信しない
  board: Cell[][];        // 6×7（惑星編）
  baseBoard: Cell[][] | null; // 6×6（秘密基地編）
  myId: string;           // 自分の安定したUUID（Player.id）
  myDealtCard?: { name: string; content: string } | null; // 自分に配布された能力カード（evilのみ）
  myAcquiredCards?: Array<{ name: string; content: string }>; // 惑星編で自分が開いて獲得した能力カード（goodのみ・裏に戻すと外れる）
  dice: DiceState;        // ダイスの状態（全員共有）
}

// サーバー内部のゲーム状態（フィルタリング前の完全な状態）
export interface ServerGameState {
  phase: GamePhase;
  players: Player[];
  board: Cell[][];
  ambushPositions: Array<{ row: number; col: number }>;
  baseBoard: Cell[][] | null;  // 秘密基地編の6x6ボード
  keyPointPositions: Array<{ row: number; col: number }>; // 重要拠点の位置
  dice: DiceState;             // ダイスの状態（全員共有）
}

// Socket.ioのイベント型定義
export interface ClientToServerEvents {
  // playerId はクライアント側で生成・保存する安定したUUID
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
  'dice:roll': () => void;
  'game:reshuffle': () => void;
  'game:restart': () => void;
  'game:end': () => void;
  'game:startBase': () => void;
  'keyPoint:set': (data: { positions: Array<{ row: number; col: number }> }) => void;
  'keyPoint:done': () => void;
  'baseCard:flip': (data: { row: number; col: number }) => void;
  'baseCard:destroy': (data: { row: number; col: number }) => void;
  'baseCard:restore': (data: { row: number; col: number }) => void;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'error': (data: { message: string }) => void;
}
