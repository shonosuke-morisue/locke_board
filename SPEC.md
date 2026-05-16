# 超人ロック ボードゲーム - 仕様書

## 目次

1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [アーキテクチャ](#3-アーキテクチャ)
4. [型定義](#4-型定義)
5. [ゲームフェーズ仕様](#5-ゲームフェーズ仕様)
6. [Socket.io イベント仕様](#6-socketio-イベント仕様)
7. [サーバー実装仕様](#7-サーバー実装仕様)
8. [クライアント実装仕様](#8-クライアント実装仕様)
9. [ゲームボード仕様](#9-ゲームボード仕様)
10. [UI・スタイル仕様](#10-uiスタイル仕様)
11. [データフロー](#11-データフロー)
12. [デプロイ仕様](#12-デプロイ仕様)

---

## 1. システム概要

「超人ロック」をテーマにした非対称対戦ボードゲームのWebアプリケーション。
プレイヤーは **秩序（good）** と **混沌（evil）** の2陣営に分かれ、リアルタイムで対戦する。

| 項目 | 内容 |
|---|---|
| 最大プレイヤー数 | 10人 |
| 最小プレイヤー数 | 2人 |
| セッション構成 | シングルルーム（サーバーは1ゲームセッションのみ管理） |
| 通信方式 | WebSocket（Socket.io） |

---

## 2. 技術スタック

### サーバー

| 項目 | 内容 |
|---|---|
| ランタイム | Node.js |
| フレームワーク | Express 4.21.1 |
| WebSocket | Socket.io 4.8.1 |
| 言語 | TypeScript 5.6.3 |
| ポート | 3001（開発）/ 環境変数 `PORT`（本番） |
| 開発実行 | ts-node-dev（ホットリロード） |
| 本番実行 | TypeScript→JavaScript コンパイル後 `node dist/index.js` |

### クライアント

| 項目 | 内容 |
|---|---|
| UIフレームワーク | React 18.3.1 |
| WebSocket | Socket.io-client 4.8.1 |
| バンドラ | Vite 5.4.10 |
| 言語 | TypeScript 5.6.3 |
| ポート | 5173（開発サーバー） |
| スタイリング | インラインスタイルのみ（外部CSSライブラリ不使用） |

---

## 3. アーキテクチャ

```
locke_board/
├── package.json              ルートビルド・起動スクリプト（Render デプロイ用）
├── server/
│   └── src/
│       ├── index.ts              サーバーエントリーポイント（Express + Socket.io 初期化）
│       ├── types.ts              型定義
│       ├── gameState.ts          ゲーム状態管理関数
│       └── socketHandlers.ts     Socket.io イベントハンドラー
│
└── client/
    └── src/
        ├── main.tsx              React エントリーポイント
        ├── App.tsx               ルートコンポーネント（フェーズ分岐・接続状態）
        ├── vite-env.d.ts         Vite 環境変数の型定義
        ├── hooks/
        │   └── useSocket.ts      Socket.io カスタムフック（状態管理・送受信）
        ├── types/
        │   └── game.ts           型定義（サーバーと共通）
        └── components/
            ├── Lobby.tsx         ロビー画面
            ├── FactionSetup.tsx  陣営割り当て画面
            ├── AmbushSetup.tsx   待ち伏せ設定画面
            ├── Board.tsx         ゲームボード（PLAYINGフェーズ）
            ├── Card.tsx          カードコンポーネント
            ├── CardDetail.tsx    カード詳細ポップアップ
            └── PlayerPiece.tsx   プレイヤーコマ
```

### 設計方針

- **シングルルーム**: サーバーは1つのゲームセッションのみ管理する
- **秘密情報フィルタリング**: サーバーが各クライアントの陣営に応じてゲーム状態をフィルタリングして送信する
- **安定プレイヤーID**: localStorage に UUID を保存し、再接続時もセッションを維持する
- **外部UIライブラリ不使用**: スタイルはすべてインラインスタイルで記述する

---

## 4. 型定義

### 基本型

```typescript
type Faction   = 'good' | 'evil'
type GamePhase = 'LOBBY' | 'FACTION_SETUP' | 'AMBUSH_SETUP' | 'PLAYING'
```

### Player

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | 安定したUUID（再接続時も変わらない） |
| `socketId` | `string` | 現在の Socket.id（接続のたびに更新） |
| `name` | `string` | プレイヤー名 |
| `faction` | `Faction \| undefined` | 陣営（割り当て前は `undefined`） |
| `isHost` | `boolean` | ホストフラグ |
| `isApproved` | `boolean` | 承認フラグ |
| `color` | `string` | コマの色（16進数RGB） |
| `position` | `{ row: number; col: number } \| null` | ボード上の現在位置（`{row:-1, col:-1}` は除外ゾーン） |
| `isConnected` | `boolean` | 現在接続中かどうか |

### CardData

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | カードのユニークID（`"card-{row}-{col}"` 形式） |
| `name` | `string` | カード名称（能力カードは他プレイヤーには隠蔽） |
| `content` | `string` | カードの詳細テキスト（能力カードは他プレイヤーには隠蔽） |
| `isFaceUp` | `boolean` | 表向きフラグ |
| `isAmbush` | `boolean` | 待ち伏せフラグ（サーバー内部管理・フィルタリング対象） |
| `ambushLabel` | `'A' \| 'B' \| null` | 待ち伏せのラベル（A=1箇所目、B=2箇所目） |
| `openedBy` | `string \| null` | 最初に表に返したプレイヤーの ID（初回のみ記録） |

### Cell

| フィールド | 型 | 説明 |
|---|---|---|
| `row` | `number` | 行インデックス（0〜5） |
| `col` | `number` | 列インデックス（0〜6） |
| `isSpaceport` | `boolean` | 宇宙港マスフラグ（`col === 0` のとき `true`） |
| `card` | `CardData \| null` | 配置されたカード（宇宙港は常に `null`） |

### GameState（クライアント送信用）

| フィールド | 型 | 説明 |
|---|---|---|
| `phase` | `GamePhase` | 現在のゲームフェーズ |
| `players` | `Player[]` | 全プレイヤー情報 |
| `board` | `Cell[][]` | 6行×7列のボードグリッド |
| `myId` | `string` | 受信クライアントの安定プレイヤーID |
| `myFaction` | `Faction \| undefined` | 受信クライアントの陣営 |
| `ambushSetCount` | `number` | 待ち伏せ設定数（evilのみ参照） |

### ServerGameState（サーバー内部用）

`GameState` の全フィールドに加え：

| フィールド | 型 | 説明 |
|---|---|---|
| `ambushPositions` | `Array<{ row: number; col: number }>` | 待ち伏せ座標（内部管理のみ） |

---

## 5. ゲームフェーズ仕様

### フェーズ遷移図

```
LOBBY → FACTION_SETUP → AMBUSH_SETUP → PLAYING
  ↑_____________________________________________|  (restart)
  ↑_____________________________________________|  (end → 全リセット)
```

### LOBBY

- プレイヤーが名前を入力して参加申請を送信する
- 最初に参加したプレイヤーが自動的にホストになる
- ホストは申請中のプレイヤーを承認する（ホスト自身は自動承認）
- 承認済み2人以上でホストが次フェーズへ移行できる

**制約**
- 名前は空文字列不可
- 参加上限は10人
- LOBBY フェーズ以外は新規参加不可（再接続は可）

### FACTION_SETUP

- ホストが承認済みの各プレイヤーに陣営（`good` / `evil`）を割り当てる
- 非ホストプレイヤーは自分の陣営のみ表示される
- 全員への割り当て完了 かつ evil プレイヤー1人以上でホストが次フェーズへ移行できる

**陣営の意味**
- `good`（秩序）: ロックの味方
- `evil`（混沌）: ロックの敵

### AMBUSH_SETUP

- evil プレイヤーがボード上の2箇所を待ち伏せとして設定する
- クリックのたびに即座にサーバーへ送信し、複数の evil プレイヤー間でリアルタイム同期される
- 設定した位置は `ambushLabel` で A・B と区別される
- good プレイヤーには「evilプレイヤーが待ち伏せを設定中です...」と表示される
- 2箇所設定完了後、evil プレイヤーがゲーム開始を確定する

**制約**
- 宇宙港マス（`col === 0`）は選択不可
- 同一マスの重複設定不可
- `ambush:set` は0〜2箇所の中間状態も受け付ける（クリックごとに送信するため）

### PLAYING

- **good プレイヤーのみ**宇宙港（`col === 0`）に配置された状態でスタート
- evil プレイヤーはコマをボードに配置しない
- コマのドラッグ&ドロップで任意のマスへ移動できる（デスクトップ）
- コマをタッチして指を動かすことで任意のマスへ移動できる（タブレット・スマホ）
- カードのダブルクリック / ダブルタップで表裏を切り替えられる
- 表向きカードを600ms長押しで詳細テキストを表示できる（マウス・タッチ共通）
- ホストはいつでもリスタートまたはゲーム終了を実行できる

**除外ゾーン**
- ボードグリッド外に独立した1マスのゾーン
- ゲームから除外されたコマをドロップして置く場所
- 除外ゾーンに置かれたコマの座標は `{ row: -1, col: -1 }`

**リスタート**: プレイヤー情報を保持したまま LOBBY に戻り、ボードをリセットする  
**ゲーム終了**: 全プレイヤー情報を削除して LOBBY に戻り、ボードをリセットする

---

## 6. Socket.io イベント仕様

### クライアント → サーバー

| イベント名 | データ型 | 説明 | 権限 |
|---|---|---|---|
| `player:join` | `{ name: string; playerId: string }` | 参加・再接続 | 全員 |
| `player:approve` | `{ playerId: string }` | プレイヤーを承認 | ホストのみ |
| `faction:assign` | `{ playerId: string; faction: Faction }` | 陣営を割り当て | ホストのみ |
| `faction:done` | なし | 陣営割り当て完了（フェーズ移行） | ホストのみ |
| `ambush:set` | `{ positions: Array<{ row: number; col: number }> }` | 待ち伏せ位置を設定（0〜2箇所） | evil のみ |
| `ambush:done` | なし | 待ち伏せ設定確定（PLAYING へ移行） | evil のみ |
| `piece:move` | `{ playerId: string; row: number; col: number }` | コマを移動（`{-1,-1}` は除外ゾーン） | 全員 |
| `card:flip` | `{ row: number; col: number }` | カードの表裏切り替え | 全員 |
| `game:restart` | なし | ゲームリスタート（プレイヤー維持） | ホストのみ |
| `game:end` | なし | ゲーム終了（全リセット） | ホストのみ |

### サーバー → クライアント

| イベント名 | データ型 | 説明 |
|---|---|---|
| `game:state` | `GameState` | ゲーム状態（陣営別フィルタリング済み） |
| `error` | `{ message: string }` | バリデーションエラー通知 |

---

## 7. サーバー実装仕様

### gameState.ts

#### buildDeck()

78枚のデッキを生成してシャッフルする（Fisher-Yates アルゴリズム）。

- カード定義（`CARD_DEFINITIONS`）に `name` と `count` を持つ
- 展開後の78枚をシャッフルし、先頭36枚をボードに配置する

**カードデッキ構成**

能力カード（計26枚）:

| カード名 | 枚数 |
|---|---|
| [能力]巡洋艦 | 1 |
| [能力]手下 | 2 |
| [能力]ＥＳＰジャマーLv3〜5 | 各1 |
| [能力]ＥＳＰフィールドLv3〜5 | 各1 |
| [能力]エネルギースーツ | 1 |
| [能力]個人用パワードスーツLv4〜5 | 各1 |
| [能力]ニケ | 1 |
| [能力]亜空間フィールド | 1 |
| [能力]ＥＳＰコントローラー | 1 |
| [能力]エネルギー吸収ボールLv3〜5 | 各1 |
| [能力]クローン | 3 |
| [能力]ジオイド弾 | 1 |
| [能力]変身 | 1 |
| [能力]ラフノールの鏡Lv5〜7 | 各1 |

イベントカード（計52枚）:

| カード名 | 枚数 |
|---|---|
| 開拓地 | 2 |
| 歓楽街 | 2 |
| 工業地域 | 2 |
| 住宅街 | 2 |
| スラム街 | 2 |
| 宇宙港 | 6 |
| 逮捕 | 4 |
| 戦闘発生 | 10 |
| トラップ | 3 |
| 情報入手 | 13 |
| 自分の正体露顕 | 2 |
| 他人の正体判明 | 4 |

#### createInitialBoard()

6×7 のセルグリッドを生成する。

- `col === 0`: 宇宙港マス（`isSpaceport: true`、カードなし）
- `col === 1〜6`: カードマス。デッキの先頭36枚を配置（`openedBy: null`、`isAmbush: false`）

#### createInitialGameState()

サーバー内部のゲーム状態を初期値で生成する。

#### addPlayer(state, socketId, playerId, name)

新規プレイヤーを追加する。

- 最初の参加者がホストになる（`isHost: true`、`isApproved: true`）
- コマ色は `PLAYER_COLORS[参加順 % 10]` から割り当てる

#### reconnectPlayer(player, newSocketId)

既存プレイヤーの `socketId` を更新して再接続を処理する。

#### disconnectPlayer(state, socketId)

プレイヤーを切断状態（`isConnected: false`）にする。プレイヤーリストからは削除しない。  
ホストが切断した場合は次の接続中プレイヤーにホスト権を移譲する。

#### restartGame(state)

LOBBY フェーズに戻し、ボードをリセットする。切断中（`isConnected: false`）のプレイヤーを削除する。

#### endGame(state)

LOBBY フェーズに戻し、ボードをリセットする。全プレイヤーを削除する。

#### createFilteredGameState(state, socketId)

クライアント向けにゲーム状態をフィルタリングして返す。

**待ち伏せ情報のフィルタリング**

| 対象 | フィルタリング内容 |
|---|---|
| good プレイヤー | 伏せカードの `isAmbush: true` / `ambushLabel` を隠す |
| evil プレイヤー | 常に `isAmbush` / `ambushLabel` を公開 |
| 表向きカード | 両陣営とも `isAmbush` / `ambushLabel` を公開 |

**能力カード情報のフィルタリング**

`[能力]` で始まるカードは `openedBy` と受信プレイヤーの ID を照合してフィルタリングする。

| 条件 | `name` / `content` |
|---|---|
| 自分が開いたカード | そのまま表示 |
| 他人が開いた / 未開封 | `name: ''`、`content: ''`（クライアントが「能力カード」と表示） |

### socketHandlers.ts

各 Socket.io イベントに対するバリデーションと処理を実装する。

状態変更が発生した際は `broadcastGameState()` を呼び出し、全接続クライアントに陣営別フィルタリング済みの状態をブロードキャストする。

#### 主なバリデーション

| イベント | バリデーション項目 |
|---|---|
| `player:join` | 名前の空文字・上限10人・フェーズチェック（LOBBY のみ新規参加可） |
| `faction:done`（LOBBY→FACTION_SETUP） | 承認済み2人以上 |
| `faction:done`（FACTION_SETUP→AMBUSH_SETUP） | 全承認済みへの陣営割り当て済み・evil 1人以上 |
| `ambush:set` | 0〜2箇所・行0〜5・列1〜6・重複チェック |
| `ambush:done` | 2箇所設定済み |
| `piece:move` | 行0〜5・列0〜6の範囲内、または `{-1,-1}`（除外ゾーン） |
| `card:flip` | 行0〜5・列1〜6の範囲内（宇宙港不可） |

#### AMBUSH_SETUP → PLAYING 移行時の処理

- **good プレイヤーのみ**宇宙港（`col === 0`）に配置する（`row: 参加順 % 6`）
- evil プレイヤーには `position` を設定しない

#### card:flip の処理

- `card.isFaceUp` を反転する
- 表に返したとき、かつ `card.openedBy === null` の場合のみ `openedBy` に操作プレイヤーIDを記録する

---

## 8. クライアント実装仕様

### useSocket フック（hooks/useSocket.ts）

#### 状態

| 名前 | 型 | 説明 |
|---|---|---|
| `gameState` | `GameState \| null` | サーバーから受信するゲーム状態 |
| `isConnected` | `boolean` | サーバー接続状態 |
| `errorMessage` | `string \| null` | エラーメッセージ |

#### 接続先 URL

| 環境 | 接続先 |
|---|---|
| 開発（`import.meta.env.PROD === false`） | `http://${window.location.hostname}:3001` |
| 本番（`import.meta.env.PROD === true`） | `window.location.origin`（同一サーバー） |

#### localStorage 統合

- キー: `locke_board_player`
- 保存内容: `{ name: string; playerId: string }`
- 接続確立時に保存済み情報があれば自動的に `player:join` を送信し再参加する

#### UUID 生成

`crypto.randomUUID()` が使用できない環境（HTTP接続のタブレット等）では `Math.random()` ベースのフォールバック実装を使用する。

#### 公開関数

`joinGame` / `approvePlayer` / `assignFaction` / `factionDone` / `setAmbush` / `ambushDone` / `movePiece` / `flipCard` / `restartGame` / `endGame` / `clearError`

### App.tsx

- サーバー接続状態インジケーター（緑=接続中 / 赤=未接続）を常時表示
- エラーメッセージをバナーで表示（×ボタンで閉じる）
- ゲーム状態未受信時はローディング表示
- `phase` の値に応じてコンポーネントを切り替える

### Lobby.tsx

**表示の切り替え**

| 状態 | 表示内容 |
|---|---|
| 未参加 | 名前入力フォーム + 参加ボタン |
| 申請中（未承認） | "参加申請中..." メッセージ |
| 承認済み（非ホスト） | "✓ 承認されました！" メッセージ |
| ホスト | 申請中プレイヤー一覧（承認ボタン付き）+ 承認済みプレイヤー一覧 + フェーズ移行ボタン |

- 「陣営割り当てを開始」ボタンは承認済み2人以上のときのみ有効

### FactionSetup.tsx

**ホスト視点**

- 承認済みプレイヤーごとに「秩序（Good）」「混沌（Evil）」ボタンを表示
- 選択済みボタンはボーダーをハイライト
- 全員割り当て済み かつ evil 1人以上で「割り当て完了」ボタンが有効

**非ホスト視点**

- 自分の陣営をバッジ表示
- 他プレイヤーの陣営は非表示（ホストが割り当て中）

### AmbushSetup.tsx

**evil プレイヤー視点**

- ボードグリッド（6×7）を表示
- セルをクリックすると即座にサーバーへ送信（複数の evil プレイヤー間でリアルタイム同期）
- 選択済みセルは背景色・枠線で強調表示し待ち伏せラベル（A/B）を表示
- 「リセット」ボタンで選択をクリア（空リストをサーバーに送信）
- 2箇所確定後、「設定完了 → ゲーム開始」ボタンが有効

**good プレイヤー視点**

- "evilプレイヤーが待ち伏せを設定中です..." メッセージと ⚔️ アイコンのみ表示

### Board.tsx

**操作方法（デスクトップ）**

| 操作 | 動作 |
|---|---|
| コマをドラッグ&ドロップ | コマを任意のマスに移動 |
| カードをダブルクリック | カードの表裏を切り替え |
| 表カードを600ms長押し | 詳細テキストポップアップを表示 |
| コマを除外ゾーンにドロップ | コマを除外ゾーン（`{row:-1, col:-1}`）に移動 |

**操作方法（タブレット・スマホ）**

| 操作 | 動作 |
|---|---|
| コマをタッチして指を移動 | コマを任意のマスに移動（`document.elementFromPoint` でドロップ先を特定） |
| 除外ゾーンへ指を移動して離す | コマを除外ゾーンに移動 |

タッチドラッグ中は `touchmove` イベントを `{ passive: false }` で登録してスクロールを防止する。  
各セルに `data-row` / `data-col` 属性、除外ゾーンに `data-eliminated` 属性を付与して drop target を特定する。

**表示要素**

- ヘッダー: タイトル・自陣営バッジ・ホスト用操作ボタン
- プレイヤー一覧: 承認済みプレイヤーの色ドット・名前・陣営ラベル
- ボードグリッド: 6×7のセルグリッド（各セル最小高さ 95px）
- 除外ゾーン: ボードグリッド下部に独立したドロップエリア

### Card.tsx

| 状態 | 表示内容 |
|---|---|
| 伏せカード（good 視点） | 背景 `#2a2a4a`、■ シンボル |
| 伏せカード（evil 視点・待ち伏せ） | 背景 `#3a1a1a`、■ シンボル + 待ち伏せラベル（右上、赤） |
| 表カード（通常） | 背景 `#2a3a5a`、`card.name` をタイトル表示 |
| 表カード（能力カード・他人が開いた） | `name` が空のため「能力カード」と表示 |
| 表カード（待ち伏せ） | 背景 `#5a1a1a`、「⚠ 待ち伏せA/B」表示 |

**タッチ操作対応**

- `onTouchStart`: 長押しタイマー開始 + タッチ開始位置を記録
- `onTouchMove`: 10px以上移動した場合は長押しキャンセル（スクロール中の誤発火防止）
- `onTouchEnd`: ダブルタップ検出（300ms以内の2回タップ）でフリップ実行

iOS Safari 対策: `touchend` でダブルタップを検出した際、`e.preventDefault()` の呼び出しに加えて `touchFlippedRef` フラグを立て、後続の `dblclick` イベントを `handleDoubleClick` 内で無視することで二重フリップを防ぐ。

### CardDetail.tsx

- 背景オーバーレイ（`rgba(0,0,0,0.75)`）でポップアップ表示
- ESC キーまたはオーバーレイクリックで閉じる
- カード名を `card.name || '能力カード'` で表示
- `card.content` が存在すれば本文として表示

### PlayerPiece.tsx

- 円形コマ（直径 28px）
- 背景色: プレイヤーカラー
- 枠線: 自コマは白（`#fff`）、他コマは半透明白（`rgba(255,255,255,0.3)`）
- 内容: プレイヤー名の頭文字1文字（大文字）
- タッチドラッグ対応: `onTouchDragStart` コールバックを受け取り `onTouchStart` で呼び出す

---

## 9. ゲームボード仕様

### グリッド構成

- 6行 × 7列
- `col === 0`: 宇宙港マス（カードなし、good プレイヤーのコマ初期配置場所）
- `col === 1〜6`: カードマス（計36枚）
- ボードグリッド外に**除外ゾーン**（独立した1エリア）

### 行と地名

| 行インデックス | 地名 | 宇宙港名 |
|---|---|---|
| 0 | 地球 | 地球宇宙港 |
| 1 | ロンウォール | ロンウォール宇宙港 |
| 2 | セレン | セレン宇宙港 |
| 3 | トア | トア宇宙港 |
| 4 | ディナール | ディナール宇宙港 |
| 5 | マイア | マイア宇宙港 |

マス名は「地名 + 列番号」（例: 地球1、マイア6）

### 秘密情報フィルタリング仕様

| 情報 | good | evil |
|---|---|---|
| 待ち伏せマスの位置（伏せ状態） | 非公開（通常の伏せカードに見える） | 公開 |
| 能力カードの名称・詳細（開いた本人） | 公開 | 公開 |
| 能力カードの名称・詳細（他人が開いた） | 「能力カード」と表示 | 「能力カード」と表示 |

---

## 10. UI・スタイル仕様

### カラーパレット

| 用途 | カラーコード |
|---|---|
| メイン背景 | `#0a0a1a` |
| ボード背景 | `#0d1a2e` |
| カードマス背景 | `#1a1a2e` |
| 宇宙港マス背景 | `#0d1530` |
| アクセント（紫） | `#7b68ee` |
| テキスト（基本） | `#e0e0e0` |
| マス名・宇宙港ラベル | `#e8e0ff` |
| good 配色 | 背景 `#1a3a6e`、テキスト `#6ea8fe` |
| evil 配色 | 背景 `#6e1a1a`、テキスト `#fe6e6e` |
| 待ち伏せ強調 | 背景 `#3d0d0d`、枠線 `#e74c3c` |
| ドラッグオーバー | 背景 `#2a3a5a`、枠線 `#7b68ee` ダッシュ |
| 除外ゾーン | 背景 `#1a0d0d`、枠線 `#5a2a2a` ダッシュ |

### プレイヤーカラー（10色）

| 番号 | 色名 | カラーコード |
|---|---|---|
| 1 | 赤 | `#e74c3c` |
| 2 | 青 | `#3498db` |
| 3 | 緑 | `#2ecc71` |
| 4 | オレンジ | `#f39c12` |
| 5 | 紫 | `#9b59b6` |
| 6 | ティール | `#1abc9c` |
| 7 | ピンク | `#e91e63` |
| 8 | ディープオレンジ | `#ff5722` |
| 9 | ブルーグレー | `#607d8b` |
| 10 | ブラウン | `#795548` |

### フォント仕様

| 要素 | フォントサイズ | 色 | 備考 |
|---|---|---|---|
| マス名ラベル | 11px | `#e8e0ff` | bold、テキストシャドウあり |
| 宇宙港ラベル | 11px | `#e8e0ff` | bold、テキストシャドウあり |
| カードタイトル | 9px | `#aac4ff` | — |
| プレイヤーバッジ | 13px | `#ddd` | — |

### セルサイズ

| コンポーネント | 最小高さ |
|---|---|
| Board.tsx（PLAYING） | 95px |
| AmbushSetup.tsx | 75px（アスペクト比1:1・最小値） |

---

## 11. データフロー

### プレイヤーID の永続化

```
初回参加時:
  クライアントが UUID を生成（crypto.randomUUID または Math.random フォールバック）
  → localStorage に保存（キー: locke_board_player）
  → サーバーに送信（player:join）

再接続時:
  localStorage から UUID を読み出し
  → サーバーに送信（player:join）
  → サーバーが playerId で照合し socketId を更新
  → 切断前の状態（陣営・位置・承認状態）を復元
```

### ゲーム状態のブロードキャスト

```
クライアント → socket イベント → サーバー
                                   ↓
                            バリデーション
                                   ↓
                            状態更新
                                   ↓
                  createFilteredGameState() で陣営別フィルタリング
                                   ↓
              全接続クライアントへ個別に game:state をブロードキャスト
```

### 待ち伏せ情報の秘匿フロー

```
サーバー内部: ambushPositions に座標保存、CardData に isAmbush=true を設定

↓ createFilteredGameState()

evil プレイヤーへ: 伏せカードでも isAmbush=true / ambushLabel を送信
good プレイヤーへ: 伏せカードの isAmbush=false / ambushLabel=null に変換して送信
                   ※表向きカードは両陣営とも isAmbush を公開
```

### 能力カード情報の秘匿フロー

```
card:flip 受信時: card.openedBy が null なら操作プレイヤーの ID を記録

↓ createFilteredGameState()

card.openedBy === 受信プレイヤーID → name / content をそのまま送信
それ以外                           → name: '', content: '' に変換して送信
                                     （クライアントが「能力カード」と表示）
```

### プレイヤー接続状態管理

```
切断:  disconnectPlayer → isConnected=false（プレイヤーは保持）
           ↓ ホスト切断時
       次の接続中プレイヤーにホスト権を移譲

リスタート: restartGame → isConnected=false のプレイヤーを削除
終了:       endGame     → 全プレイヤーを削除
```

---

## 12. デプロイ仕様

### 本番環境構成

クライアントとサーバーを単一の Node.js プロセスとして Render に配置する。

```
Render Web Service
└── Node.js プロセス（server/dist/index.js）
    ├── Socket.io サーバー
    ├── Express API（/health）
    └── client/dist の静的ファイル配信（本番環境のみ）
```

### 環境変数

| 変数名 | 値 | 説明 |
|---|---|---|
| `NODE_ENV` | `production` | 静的ファイル配信を有効化 |
| `PORT` | Render が自動設定 | リッスンポート |

### ビルド・起動スクリプト（ルート package.json）

| スクリプト | コマンド | 説明 |
|---|---|---|
| `build` | `cd client && npm install --include=dev && npx vite build && cd ../server && npm install --include=dev && npm run build` | クライアント・サーバー両方をビルド |
| `start` | `NODE_ENV=production node server/dist/index.js` | 本番サーバー起動 |

### Render 設定

| 項目 | 値 |
|---|---|
| Language | Node |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Instance Type | Free（または有料プラン） |

### 無料プランの制限

- 15分間アクセスがない場合スリープ状態に移行する
- 次のアクセス時に30秒〜1分の起動待ち時間が発生する
- セッション開始前にホストがURLへアクセスしてウォームアップすることを推奨する
