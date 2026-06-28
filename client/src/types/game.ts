// ゲームの型定義（クライアント側）

export type Faction = 'good' | 'evil';
export type GamePhase = 'LOBBY' | 'FACTION_SETUP' | 'AMBUSH_SETUP' | 'PLAYING' | 'BASE_SETUP' | 'BASE_PLAYING';

// プレイヤー情報
export interface Player {
  id: string;          // 安定したUUID（再接続しても変わらない）
  name: string;
  faction?: Faction;
  isHost: boolean;
  isApproved: boolean;
  color: string;       // コマの色
  position: { row: number; col: number } | null;
  isConnected: boolean; // 現在接続中かどうか
}

// カードデータ
export interface CardData {
  id: string;
  name: string;            // カード名称（能力カードは開いた本人以外には空文字が送信される）
  content: string;         // カードの詳細テキスト（同上）
  isAbility: boolean;      // 能力カードかどうか
  isFaceUp: boolean;
  isAmbush: boolean;       // evilは常に、goodはオープン時のみtrueが送信される
  ambushLabel: 'A' | 'B' | null; // 待ち伏せの識別ラベル
  openedBy: string | null; // カードを開いたプレイヤーのID
  isDestroyed: boolean;    // 破壊状態（秘密基地カード用）
  isKeyPoint: boolean;     // 重要拠点カードかどうか
  keyPointLabel: string | null; // 重要拠点のラベル
}

// マス情報
export interface Cell {
  row: number;
  col: number;
  isSpaceport: boolean; // col === 0
  card: CardData | null;
}

// ダイス（2個）の状態（全員共有）
export interface DiceState {
  values: [number, number];     // 各サイコロの目（1〜6）
  rolledByName: string | null;  // 最後にロールしたプレイヤー名
  rollId: number;               // ロールごとに増えるカウンタ（アニメーション検知用）
}

// サーバーから受信するゲーム状態
export interface GameState {
  phase: GamePhase;
  players: Player[];
  board: Cell[][];        // 6×7（惑星編）
  baseBoard: Cell[][] | null; // 6×6（秘密基地編）
  myId: string;           // 自分の安定したUUID（Player.id）
  myDealtCard?: { name: string; content: string } | null; // 自分に配布された能力カード（evilのみ）
  dice: DiceState;        // ダイスの状態（全員共有）
}
