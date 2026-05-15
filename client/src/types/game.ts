// ゲームの型定義（クライアント側）

export type Faction = 'law' | 'evil';
export type GamePhase = 'LOBBY' | 'FACTION_SETUP' | 'AMBUSH_SETUP' | 'PLAYING';

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
  content: string;        // カードの詳細テキスト
  isFaceUp: boolean;
  isAmbush: boolean;      // evilは常に、lawはオープン時のみtrueが送信される
  ambushLabel: 'A' | 'B' | null; // 待ち伏せの識別ラベル
}

// マス情報
export interface Cell {
  row: number;
  col: number;
  isSpaceport: boolean; // col === 0
  card: CardData | null;
}

// サーバーから受信するゲーム状態
export interface GameState {
  phase: GamePhase;
  players: Player[];
  board: Cell[][];   // 6×7
  myId: string;      // 自分の安定したUUID（Player.id）
  myFaction?: Faction;
  ambushSetCount: number; // AMBUSH_SETUPフェーズで何箇所設定済みか（evilのみ）
}
