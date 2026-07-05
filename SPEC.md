# 超人ロック ボードゲーム - 仕様書

> 本書はゲームの**正式仕様**であり、現状の実装を正とする。開発・ビルド・デプロイの手順は [CLAUDE.md](./CLAUDE.md) を参照。

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
10. [秘密情報フィルタリング仕様](#10-秘密情報フィルタリング仕様)
11. [UI・スタイル仕様](#11-uiスタイル仕様)
12. [データフロー](#12-データフロー)
13. [デプロイ仕様](#13-デプロイ仕様)

---

## 1. システム概要

「超人ロック」をテーマにした非対称対戦ボードゲームのWebアプリケーション。
プレイヤーは **秩序（good）** と **混沌（evil）** の2陣営に分かれ、リアルタイムで対戦する。

ゲームは2部構成で、ホストの操作で **惑星編**（PLAYING）から **秘密基地編**（BASE_PLAYING）へ移行する。

| 項目 | 内容 |
|---|---|
| 最大プレイヤー数 | 10人 |
| 最小プレイヤー数 | 2人 |
| セッション構成 | シングルルーム（サーバーは1ゲームセッションのみ管理） |
| 通信方式 | WebSocket（Socket.io） |
| ゲーム構成 | 惑星編（6×7ボード）→ 秘密基地編（6×6ボード） |

---

## 2. 技術スタック

### サーバー

| 項目 | 内容 |
|---|---|
| ランタイム | Node.js（>=18） |
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
│       ├── gameState.ts          ゲーム状態管理関数・カード定義
│       └── socketHandlers.ts     Socket.io イベントハンドラー
│
└── client/
    ├── index.html               favicon / apple-touch-icon 参照
    ├── public/
    │   ├── favicon.svg          favicon
    │   └── apple-touch-icon.png iOSホーム画面アイコン（180×180）
    └── src/
        ├── main.tsx             React エントリーポイント
        ├── App.tsx              ルートコンポーネント（フェーズ分岐・接続状態）
        ├── constants.ts         共通定数（PLANET_NAMES / ROW_LABELS / KEY_POINT_LABELS）
        ├── vite-env.d.ts        Vite 環境変数の型定義
        ├── hooks/
        │   ├── useSocket.ts     Socket.io カスタムフック（状態管理・送受信）
        │   ├── useTouchTap.ts   タップ操作（シングル/ダブル/2本指）フック
        │   └── useTouchDrag.ts  タッチドラッグ&ドロップ フック
        ├── types/
        │   └── game.ts          型定義（サーバーと共通）
        └── components/
            ├── Lobby.tsx          ロビー画面
            ├── FactionSetup.tsx   陣営割り当て画面
            ├── AmbushSetup.tsx    待ち伏せ設定画面（惑星編）
            ├── Board.tsx          惑星編ゲームボード（6×7）
            ├── Card.tsx           惑星編カード
            ├── CardDetail.tsx     カード詳細ポップアップ（現在未使用）
            ├── BaseSetup.tsx      重要拠点設定画面（秘密基地編）
            ├── BaseBoard.tsx      秘密基地編ゲームボード（6×6）
            ├── BaseCard.tsx       秘密基地カード
            ├── DealtCardModal.tsx 配布された能力カードのポップアップ（共通利用）
            ├── DicePanel.tsx      ダイス（2個）パネル（惑星編・秘密基地編で共通利用）
            └── PlayerPiece.tsx    プレイヤーコマ
```

### 設計方針

- **シングルルーム**: サーバーは1つのゲームセッションのみ管理する
- **秘密情報フィルタリング**: サーバーが各クライアントの陣営に応じてゲーム状態をフィルタリングして送信する
- **安定プレイヤーID**: localStorage に UUID を保存し、再接続時もセッションを維持する
- **外部UIライブラリ不使用**: スタイルはすべてインラインスタイルで記述する
- **陣営は公開情報**: good/evil の陣営自体は全プレイヤーに公開される。秘匿対象は「待ち伏せ位置」「能力カードの中身」「重要拠点」「配布された能力カード」である

---

## 4. 型定義

### 基本型

```typescript
type Faction   = 'good' | 'evil'
type GamePhase = 'LOBBY' | 'FACTION_SETUP' | 'AMBUSH_SETUP' | 'PLAYING' | 'BASE_SETUP' | 'BASE_PLAYING'
```

### Player

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | 安定したUUID（再接続時も変わらない） |
| `socketId` | `string` | 現在の Socket.id（接続のたびに更新・サーバー内部管理。送信時は `players` から除外） |
| `name` | `string` | プレイヤー名 |
| `faction` | `Faction \| undefined` | 陣営（割り当て前は `undefined`） |
| `isHost` | `boolean` | ホストフラグ |
| `isApproved` | `boolean` | 承認フラグ |
| `color` | `string` | コマの色（16進数RGB） |
| `position` | `{ row: number; col: number } \| null` | ボード上の現在位置（`{row:-1, col:-1}` は除外ゾーン） |
| `isConnected` | `boolean` | 現在接続中かどうか |
| `dealtCard` | `{ name: string; content: string } \| null \| undefined` | AMBUSH_SETUP で配布された能力カード（evilのみ・内部管理）。送信時は `players` から除外され、本人にのみ `GameState.myDealtCard` として届く |

### CardData

惑星編・秘密基地編で共通の型。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | カードのユニークID（`"card-{row}-{col}"` 形式） |
| `name` | `string` | カード名称（能力カードは開いた本人以外には空文字で送信） |
| `content` | `string` | カードの詳細テキスト（同上） |
| `isAbility` | `boolean` | 能力カードフラグ（秘匿判定はこのフラグで行う。秘密基地カードは常に `false`） |
| `isFaceUp` | `boolean` | 表向きフラグ |
| `isAmbush` | `boolean` | 待ち伏せフラグ（惑星編・サーバー内部管理・フィルタリング対象） |
| `ambushLabel` | `'A' \| 'B' \| null` | 待ち伏せのラベル（A=1箇所目、B=2箇所目） |
| `openedBy` | `string \| null` | 最後に表に返した **good** プレイヤーの ID（good のフリップ時のみ更新。evil・未参加ソケットのフリップでは変更されない。能力カードの閲覧権と獲得判定に使用） |
| `isDestroyed` | `boolean` | 破壊状態フラグ |
| `isKeyPoint` | `boolean` | 重要拠点フラグ（秘密基地編・フィルタリング対象） |
| `keyPointLabel` | `string \| null` | 重要拠点のラベル兼表示名（エネルギー・ルーム等。名称に `<br>` を含めるとクライアントで改行として描画される） |

### Cell

| フィールド | 型 | 説明 |
|---|---|---|
| `row` | `number` | 行インデックス |
| `col` | `number` | 列インデックス |
| `isSpaceport` | `boolean` | 宇宙港マスフラグ（惑星編で `col === 0` のとき `true`。秘密基地編は常に `false`） |
| `card` | `CardData \| null` | 配置されたカード（惑星編の宇宙港は `null`） |

### DiceState

サイコロ2個の状態。サーバーが生成し全クライアントへ同期する**公開情報**（フィルタリング対象外）。

| フィールド | 型 | 説明 |
|---|---|---|
| `values` | `[number, number]` | 各サイコロの目（1〜6） |
| `rolledByName` | `string \| null` | 最後にロールしたプレイヤー名 |
| `rollId` | `number` | ロールごとに増えるカウンタ（クライアントのアニメーション検知用） |

### GameState（クライアント送信用）

| フィールド | 型 | 説明 |
|---|---|---|
| `phase` | `GamePhase` | 現在のゲームフェーズ |
| `players` | `Array<Omit<Player, 'socketId'>>` | 全プレイヤー情報（各プレイヤーの `dealtCard` とサーバー内部の `socketId` は除外して送信） |
| `board` | `Cell[][]` | 惑星編ボード（6行×7列） |
| `baseBoard` | `Cell[][] \| null` | 秘密基地編ボード（6行×6列。秘密基地編に入るまで `null`） |
| `myId` | `string` | 受信クライアントの安定プレイヤーID（`Player.id`） |
| `myDealtCard` | `{ name: string; content: string } \| null \| undefined` | 自分に配布された能力カード（evilのみ。good は `null`） |
| `myAcquiredCards` | `Array<{ name: string; content: string }> \| undefined` | 惑星編で自分が開いて獲得した能力カード（goodのみ。evil は空配列）。惑星編ボードの「`isAbility` かつ非待ち伏せかつ表向きかつ `openedBy === 自分`」のカードから導出され、裏に戻されると自動的に外れる |
| `dice` | `DiceState` | ダイスの状態（全員共有） |

> 旧仕様にあった `myFaction` / `ambushSetCount` は廃止。陣営は `players[].faction`、待ち伏せ設定数は `board` の `isAmbush` 集計から導出する。

### ServerGameState（サーバー内部用）

| フィールド | 型 | 説明 |
|---|---|---|
| `phase` | `GamePhase` | 現在のフェーズ |
| `players` | `Player[]` | 全プレイヤー（`dealtCard` を保持） |
| `board` | `Cell[][]` | 惑星編ボード |
| `ambushPositions` | `Array<{ row: number; col: number }>` | 待ち伏せ座標（内部管理のみ） |
| `baseBoard` | `Cell[][] \| null` | 秘密基地編ボード |
| `keyPointPositions` | `Array<{ row: number; col: number }>` | 重要拠点座標（内部管理のみ） |
| `dice` | `DiceState` | ダイスの状態（全員共有） |

---

## 5. ゲームフェーズ仕様

### フェーズ遷移図

```
LOBBY → FACTION_SETUP → AMBUSH_SETUP → PLAYING → BASE_SETUP → BASE_PLAYING
  ↑________________________________________________________________|  (restart: プレイヤー維持)
  ↑________________________________________________________________|  (end: 全リセット)
```

リスタート・終了はどのフェーズからでもホストが実行でき、LOBBY に戻る。

### LOBBY

- プレイヤーが名前を入力して参加申請を送信する
- 最初に参加したプレイヤーが自動的にホストになる
- ホストは申請中のプレイヤーを承認する（ホスト自身は自動承認）
- 承認済み2人以上でホストが次フェーズへ移行できる
- **参加キャンセル**: LOBBY フェーズ中のみ `player:leave` で退出できる（他フェーズでは不可）
- **ホスト移譲（退出時）**: 「承認済み＆接続中」→「接続中」→「リスト先頭」の優先順位で移譲する
- **ホスト移譲（切断時）**: 接続中の次のプレイヤーへ自動移譲する（プレイヤーはリストに残る）
- **ホスト委譲（手動）**: ホストは参加プレイヤー一覧の他プレイヤーの行をクリック（タップ）し、確認ダイアログを経て `host:transfer` でホスト権限を委譲できる（LOBBY のみ。委譲先は接続中であること。新ホストは自動承認される）

**制約**
- 名前は空文字列不可
- 参加上限は10人
- LOBBY フェーズ以外は新規参加不可（再接続は可）

### FACTION_SETUP

- ホストが承認済みの各プレイヤーに陣営（`good` / `evil`）を割り当てる
- 全員への割り当て完了 かつ evil プレイヤー1人以上でホストが次フェーズへ移行できる

**陣営の意味**
- `good`（秩序）: ロックの味方
- `evil`（混沌）: ロックの敵

### AMBUSH_SETUP

- evil プレイヤーがボード上の2箇所を待ち伏せとして設定する
- クリックのたびに即座にサーバーへ送信し、複数の evil プレイヤー間でリアルタイム同期される
- 設定した位置は `ambushLabel` で A・B と区別される（1箇所目がA、2箇所目がB）
- good プレイヤーには「evilプレイヤーが待ち伏せを設定中です...」と表示される
- 2箇所設定完了後、evil プレイヤーがゲーム開始を確定する（PLAYING へ移行）

**能力カードの配布**
- FACTION_SETUP → AMBUSH_SETUP 移行時に、**evil プレイヤー1人につき惑星編デッキの能力カードを1枚配布**する
- 配布された能力カードは惑星編ボードの配置（先頭36枚）から除外される
- 配布カードは**本人にのみ** `GameState.myDealtCard` として送信される（他プレイヤー・good には非公開）
- 画面遷移時にポップアップ（`DealtCardModal`）で提示し、「🎴 獲得した能力カードを表示」ボタンで再表示できる

**制約**
- 宇宙港マス（`col === 0`）は選択不可
- 同一マスの重複設定不可
- `ambush:set` は0〜2箇所の中間状態も受け付ける（クリックごとに送信するため）

### PLAYING（惑星編）

- **good プレイヤーのみ**除外ゾーン（`{ row: -1, col: -1 }`）に配置された状態でスタート（evil はコマなし）。各自がコマをドラッグして開始位置（宇宙港など）へ移動する
- コマのドラッグ&ドロップ／タッチドラッグで任意のマスへ移動できる
- カードのダブルクリック / ダブルタップで表裏を切り替えられる
- 表向きカードのクリック／シングルタップで**右側の詳細パネル**に内容を表示する（裏カードをめくると自動で開く）
- **カード破壊**: 表向きカードを右クリック（モバイルは2本指タッチ）でコンテキストメニューを開き「破壊」「元に戻す」を選べる
- 配布された能力カードは、プレイヤー一覧の自分の名前（🎴付き）クリックで再表示できる
- **能力カードの獲得（good）**: good プレイヤーが能力カードを表に返すと、そのカードを獲得する（`openedBy` は **good のフリップ時のみ**更新され、最後に開いた good プレイヤーが獲得者となる。evil のフリップでは変更されないため、evil が閲覧権・獲得権を奪うことはできない）。**待ち伏せマス（`isAmbush`）は戦闘扱いのため、元のカードが能力カードでも獲得・閲覧の対象にならない**。獲得カードはプレイヤー一覧の自分の名前（🎴付き・複数枚は枚数表示）クリックで一覧表示できる（`AcquiredCardsModal`：カード名リスト＋クリックで説明を排他表示）。カードが裏に戻されると獲得から外れる
- **ダイス**: 詳細パネル上部のダイスパネルで「ダイスロール」可能。サーバーが2個（1〜6）を生成して全員へ同期し、回転演出後に確定する（最後のロール者も全員で共有）
- **リシャッフル（ホストのみ）**: 伏せているカード（裏向きかつ未破壊）の中身だけをシャッフルして同じマス群に再配置する。表向き・破壊済みカードと、マスに紐づく待ち伏せの場所は変わらない。再配置されたカードの `openedBy` はリセットされる（伏せカードは獲得対象外のため獲得リストへの影響はない）
- ホストはいつでもリシャッフル／リスタート／ゲーム終了／秘密基地編へ移行が可能

**除外ゾーン**
- ボードグリッド下部の独立したドロップエリア
- コマをここへ移動すると除外扱いとなり、座標は `{ row: -1, col: -1 }`

### BASE_SETUP

- ホストが PLAYING 中に「秘密基地編へ」（`game:startBase`）を押すと遷移する
- 全プレイヤーのコマが除外ゾーン（`{ row: -1, col: -1 }`）にリセットされる
- evil プレイヤーが秘密基地ボードの**内側16マス（B2〜E5 / row 1〜4・col 1〜4）**に重要拠点を4箇所設定する
- 最外周（A行・F行・1列・6列）は選択不可
- 設定順に「エネルギー・ルーム」「コンピューター・ルーム」「研究室」「指令室」の重要拠点ラベルが付与される（ラベルに `<br>` を含めるとカード面・詳細パネルで改行として描画される）
- クリックのたびに即サーバーへ送信し、全 evil プレイヤーへリアルタイム同期される
- good プレイヤーには待機画面が表示される
- 4箇所設定完了後、evil プレイヤーが「設定完了」を押すと BASE_PLAYING へ移行する

### BASE_PLAYING（秘密基地編）

- 6行×6列の秘密基地ボードを使用（行ラベル A〜F、列ラベル 1〜6、宇宙港なし）
- コマのドラッグ&ドロップ／タッチドラッグで移動できる
- カードのダブルクリック / ダブルタップで表裏切り替え
- 表向きカードのクリックで右側パネルに詳細表示（裏カードをめくると自動で開く）
- **カード破壊**: 右クリック / 2本指タッチのコンテキストメニューから破壊・復元
- 重要拠点カードは evil には常に公開、good にはカードが表になった時のみ公開
- 配布された能力カードは、プレイヤー一覧の自分の名前クリックで再表示できる
- good が惑星編で獲得した能力カード（`myAcquiredCards`）も、自分の名前クリックで一覧表示できる（惑星編ボードは保持されるため獲得状態は引き継がれる）
- **ダイス**: 詳細パネル上部のダイスパネルで「ダイスロール」可能（PLAYING と同じ全員共有の仕様）
- **リシャッフル（ホストのみ）**: 伏せているカード（裏向きかつ未破壊）の中身だけをシャッフルして再配置する。重要拠点の場所（`isKeyPoint` / `keyPointLabel`）はマスに紐づくため変わらない
- 除外ゾーンは PLAYING と同仕様
- ホストはいつでもリシャッフル／リスタート／ゲーム終了が可能

**リスタート**: プレイヤー情報を保持したまま LOBBY に戻り、ボード・配布カードをリセットする
**ゲーム終了**: 全プレイヤー情報を削除して LOBBY に戻り、全状態をリセットする

---

## 6. Socket.io イベント仕様

### クライアント → サーバー

| イベント名 | データ型 | 説明 | 権限 |
|---|---|---|---|
| `player:join` | `{ name: string; playerId: string }` | 参加・再接続 | 全員 |
| `player:leave` | なし | LOBBY 中に退出 | 全員（LOBBYのみ） |
| `player:approve` | `{ playerId: string }` | プレイヤーを承認 | ホストのみ |
| `host:transfer` | `{ playerId: string }` | ホスト権限を指定プレイヤーに委譲（LOBBY のみ・委譲先は接続中・新ホストは自動承認） | ホストのみ |
| `faction:assign` | `{ playerId: string; faction: Faction }` | 陣営を割り当て | ホストのみ |
| `faction:done` | なし | 陣営割り当て完了（LOBBYなら開始、FACTION_SETUPなら次フェーズ） | ホストのみ |
| `ambush:set` | `{ positions: Array<{ row: number; col: number }> }` | 待ち伏せ位置を設定（0〜2箇所） | evil のみ |
| `ambush:done` | なし | 待ち伏せ設定確定（PLAYING へ移行） | evil のみ |
| `piece:move` | `{ playerId: string; row: number; col: number }` | コマを移動（`{-1,-1}` は除外ゾーン） | 全員 |
| `card:flip` | `{ row: number; col: number }` | 惑星編カードの表裏切り替え | 全員 |
| `card:destroy` | `{ row: number; col: number }` | 惑星編カードを破壊 | 全員 |
| `card:restore` | `{ row: number; col: number }` | 惑星編カードの破壊解除 | 全員 |
| `dice:roll` | なし | ダイス2個を振る（サーバーが目を生成し全員へ同期） | 全員（参加済み） |
| `game:reshuffle` | なし | 伏せているカードの中身を再配置（PLAYING は惑星編ボード、BASE_PLAYING は秘密基地ボードが対象） | ホストのみ |
| `game:restart` | なし | ゲームリスタート（プレイヤー維持） | ホストのみ |
| `game:end` | なし | ゲーム終了（全リセット） | ホストのみ |
| `game:startBase` | なし | 秘密基地編へ移行（PLAYING からのみ） | ホストのみ |
| `keyPoint:set` | `{ positions: Array<{ row: number; col: number }> }` | 重要拠点位置を設定（0〜4箇所） | evil のみ |
| `keyPoint:done` | なし | 重要拠点設定完了（BASE_PLAYING へ移行） | evil のみ |
| `baseCard:flip` | `{ row: number; col: number }` | 秘密基地カードの表裏切り替え | 全員 |
| `baseCard:destroy` | `{ row: number; col: number }` | 秘密基地カードを破壊 | 全員 |
| `baseCard:restore` | `{ row: number; col: number }` | 秘密基地カードの破壊解除 | 全員 |

### サーバー → クライアント

| イベント名 | データ型 | 説明 |
|---|---|---|
| `game:state` | `GameState` | ゲーム状態（陣営別フィルタリング済み） |
| `error` | `{ message: string }` | バリデーションエラー通知 |

---

## 7. サーバー実装仕様

### gameState.ts

#### カード定義

- `CARD_DEFINITIONS`（惑星編）: `{ name, count, content, isAbility }` の配列。全78枚（能力26 + イベント52）
- `BASE_CARD_RAW`（秘密基地編）: `{ name, count, content }` の配列。全52枚（すべて `isAbility: false`）
- `KEY_POINT_LABELS` / `KEY_POINT_DESCRIPTIONS`: 重要拠点のラベルと説明文

#### buildDeck()

惑星編デッキ（78枚）を展開して Fisher-Yates でシャッフルする。

#### createBoardFromDeck(deck) / createInitialBoard()

- `createBoardFromDeck(deck)`: 与えられたデッキ配列の先頭から 6×7 ボードを生成する（`col===0` は宇宙港でカードなし、`col 1〜6` にカードを配置）
- `createInitialBoard()`: `createBoardFromDeck(buildDeck())` のラッパ（全78枚から先頭36枚を配置）

#### createInitialBaseBoard()

秘密基地編デッキ（52枚）をシャッフルし、6×6 の全36マスに先頭36枚を配置する（残り16枚は未使用）。

#### dealAmbushCards(state)

FACTION_SETUP → AMBUSH_SETUP 移行時に呼び出す。

1. 惑星編デッキ（78枚）を生成・シャッフル
2. 全プレイヤーの `dealtCard` をクリア（リスタート時の再配布に備える）
3. デッキ先頭から能力カードを evil 人数分取り出して各 evil に配布
4. 配布分を除いた残りデッキから `createBoardFromDeck` でボードを再生成

#### addPlayer / reconnectPlayer / disconnectPlayer / leaveGame

- `addPlayer`: 新規プレイヤー追加。最初の参加者がホスト（自動承認）。色は `PLAYER_COLORS` から未使用色を割り当て
- `reconnectPlayer`: `socketId` を更新して再接続
- `disconnectPlayer`: `isConnected=false`（リストからは削除しない）。ホスト切断時は接続中の次プレイヤーへ移譲
- `leaveGame`: LOBBY 中の退出。ホストは「承認済み＆接続中→接続中→先頭」優先で移譲

#### setKeyPoints(state, positions) / startBase(state)

- `setKeyPoints`: 重要拠点を設定し、設定順に `KEY_POINT_LABELS` のラベルを付与
- `startBase`: BASE_SETUP へ移行。`baseBoard` を生成し、全コマを除外ゾーンへリセット

#### restartGame(state) / endGame(state)

- `restartGame`: LOBBY に戻しボードをリセット。切断中プレイヤーを削除、残りの `faction` / `position` / `dealtCard` をリセット
- `endGame`: LOBBY に戻し全プレイヤーを削除、全状態をリセット
- いずれも `state.dice` を初期状態（`rollId: 0`）にリセットする

#### rollDice(state, playerName)

ダイス2個（各1〜6）を生成して `state.dice` を更新する（`rolledByName` に操作者名、`rollId` を加算）。ダイスは全員共有の公開情報。

#### reshuffleFaceDownCards(board)

指定ボード上の「裏向きかつ未破壊」のカードを対象に、中身（`name` / `content` / `isAbility`）だけを Fisher-Yates でシャッフルして同じマス群に書き戻す。マスに紐づく情報（`id` / `isAmbush` / `ambushLabel` / `isKeyPoint` / `keyPointLabel`）と表向き・破壊済みカードは変更しない。再配置後の中身は誰も開いていないため、対象カードの `openedBy` は `null` にリセットする。

#### createFilteredGameState(state, socketId)

クライアント向けにゲーム状態をフィルタリングして返す。

- **能力カード**: `isAbility` が真のカードは、`openedBy === 受信者の playerId`（＝本人が開いた）でない限り `name` / `content` を空文字にする。受信者が未参加ソケット（`playerId` が null）の場合は、未開封カード（`openedBy === null`）との null 同士の一致で開示されないよう明示的に非公開とする
- **待ち伏せ（惑星編）**: `isAmbush` / `ambushLabel` は evil または当該カードが表向きのときのみ公開
- **重要拠点（秘密基地編）**: `isKeyPoint` / `keyPointLabel` は evil または表向きのときのみ公開。公開時は送信用カードの `name` を `keyPointLabel`、`content` を `KEY_POINT_DESCRIPTIONS` に差し替える
- **配布カード**: `players` 配列から各プレイヤーの `dealtCard` を除外し、受信者本人の分のみ `myDealtCard` として付与
- **獲得カード**: 受信者が good の場合、惑星編ボードから「`isAbility` かつ非待ち伏せ（`!isAmbush`）かつ表向きかつ `openedBy === 受信者`」のカードを抽出して `myAcquiredCards` として付与（evil は空配列）
- **ダイス**: `state.dice` はフィルタせず全員へそのまま送信（公開情報）

### socketHandlers.ts

各 Socket.io イベントに対するバリデーションと処理を実装する。状態変更時は `broadcastGameState()` で全接続クライアントへ陣営別フィルタリング済み状態をブロードキャストする。

#### 主なバリデーション

| イベント | バリデーション項目 |
|---|---|
| `player:join` | 名前の空文字・上限10人・フェーズチェック（LOBBY のみ新規参加可） |
| `player:leave` | LOBBY フェーズのみ |
| `host:transfer` | ホスト限定・LOBBY のみ・委譲先が存在し接続中であること（自分自身への委譲は無視） |
| `faction:done`（LOBBY→FACTION_SETUP） | 承認済み2人以上 |
| `faction:done`（FACTION_SETUP→AMBUSH_SETUP） | 全承認済みへの割り当て済み・evil 1人以上。移行時に `dealAmbushCards` を実行 |
| `ambush:set` / `ambush:done` | evil 限定・AMBUSH_SETUP・0〜2箇所/重複チェック・確定は2箇所必須 |
| `piece:move` | 行0〜5・列0〜6、または `{-1,-1}`（除外ゾーン） |
| `card:flip` / `card:destroy` / `card:restore` | PLAYING・行0〜5・列1〜6（宇宙港不可） |
| `dice:roll` | 参加済みプレイヤーのみ（`rollDice` を実行して全員へ同期） |
| `game:startBase` | ホスト限定・PLAYING のみ |
| `keyPoint:set` / `keyPoint:done` | evil 限定・BASE_SETUP・内側16マス（row/col 1〜4）・重複チェック・確定は4箇所必須 |
| `baseCard:flip` / `baseCard:destroy` / `baseCard:restore` | BASE_PLAYING・行0〜5・列0〜5 |
| `game:reshuffle` | ホスト限定・PLAYING / BASE_PLAYING のみ（`reshuffleFaceDownCards` を実行） |
| `game:restart` / `game:end` | ホスト限定 |

#### AMBUSH_SETUP → PLAYING 移行時のコマ初期配置

- **good プレイヤーのみ**除外ゾーン（`{ row: -1, col: -1 }`）に配置する
- evil プレイヤーには `position` を設定しない

#### card:flip の openedBy 記録

表に返したとき、操作プレイヤーが **good かつ待ち伏せマスでない場合のみ** `openedBy` を更新する（最後に開いた good プレイヤーが能力カードの閲覧権と獲得権を持つ）。evil・未参加ソケットのフリップでは `openedBy` を変更しない（＝evil は閲覧権・獲得権を奪えない。evil が裏の能力カードを開いても中身は誰にも公開されない）。待ち伏せマス（`isAmbush`）は戦闘扱いのため、元が能力カードでも `openedBy` を記録しない（中身は誰にも公開されない）。`baseCard:flip` は `openedBy` を記録しない。

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

- キー: `locke_board_player`、保存内容: `{ name: string; playerId: string }`
- 接続確立時に保存済み情報があれば自動的に `player:join` を送信し再参加する
- UUID は `crypto.randomUUID()`、使用不可環境（HTTP接続のタブレット等）では `Math.random()` フォールバック

#### 公開関数

各 Socket.io イベントに対応した送信関数を公開する。
`joinGame` / `leaveGame` / `approvePlayer` / `assignFaction` / `factionDone` / `setAmbush` / `ambushDone` / `movePiece` / `flipCard` / `destroyCard` / `restoreCard` / `rollDice` / `restartGame` / `endGame` / `startBase` / `setKeyPoints` / `keyPointsDone` / `flipBaseCard` / `destroyBaseCard` / `restoreBaseCard` / `clearError`

### useTouchTap / useTouchDrag フック

- `useTouchTap`: カードのシングルタップ（詳細表示）・ダブルタップ（フリップ）・2本指タップ（コンテキストメニュー）を判別。iOS Safari の二重発火対策として `touchend` のダブルタップ検出時にフラグを立て後続 `dblclick` を無視する
- `useTouchDrag`: コマのタッチドラッグ&ドロップ。`touchmove` を `{ passive: false }` で登録しスクロールを防止。`document.elementFromPoint` と `data-row` / `data-col` / `data-eliminated` 属性でドロップ先を特定

### App.tsx

- サーバー接続状態インジケーター（緑=接続中 / 赤=未接続）を常時表示
- エラーメッセージをバナーで表示（×ボタンで閉じる）
- `phase` の値に応じてコンポーネントを切り替える（LOBBY/FACTION_SETUP/AMBUSH_SETUP→各設定画面、PLAYING→Board、BASE_SETUP→BaseSetup、BASE_PLAYING→BaseBoard）

### 各画面コンポーネント

| コンポーネント | 役割 |
|---|---|
| Lobby.tsx | 参加申請・承認・フェーズ移行（承認済み2人以上で有効）。ホストは他プレイヤーの行クリックでホスト権限を委譲できる |
| FactionSetup.tsx | ホストが陣営割り当て。全員割当＆evil1人以上で完了ボタン有効。割り当てられた陣営は全プレイヤーに表示（公開情報） |
| AmbushSetup.tsx | evil が待ち伏せ2箇所を設定。配布能力カードのポップアップ表示。good は待機画面 |
| Board.tsx | 惑星編6×7ボード。コマ移動・フリップ・右側詳細パネル・破壊メニュー・プレイヤー一覧（自分の名前クリックで配布カード再表示／good は獲得カード一覧表示） |
| Card.tsx | 惑星編カード。能力/情報入手/待ち伏せ/破壊で配色を変える。クリック=詳細、ダブル=フリップ、右クリック/2本指=メニュー |
| BaseSetup.tsx | evil が重要拠点4箇所（内側16マス）を設定。good は待機画面 |
| BaseBoard.tsx | 秘密基地編6×6ボード。Board.tsx と同等の操作。重要拠点表示 |
| BaseCard.tsx | 秘密基地カード。evil の裏面に重要拠点★を表示 |
| DealtCardModal.tsx | 配布能力カードのポップアップ（AmbushSetup / Board / BaseBoard で共通利用） |
| AcquiredCardsModal.tsx | good が獲得した能力カードの一覧ポップアップ（Board / BaseBoard で共通利用）。カード名リストを表示し、名前クリックで説明を排他表示（同時に1枚のみ） |
| DicePanel.tsx | ダイス2個・ロールボタン・最後のロール者を表示。`rollId` 増加を検知し回転演出（Board / BaseBoard の詳細パネル上に表示） |
| CardDetail.tsx | カード詳細ポップアップ（**現在未使用**。詳細表示は各ボードの右側パネルに統合済み） |
| PlayerPiece.tsx | 円形コマ（プレイヤーカラー、頭文字、タッチドラッグ対応） |

---

## 9. ゲームボード仕様

### 惑星編（6×7）

- 6行 × 7列。`col === 0` は宇宙港マス（カードなし、good のコマ初期配置）、`col 1〜6` はカードマス（計36枚）
- ボードグリッド外に**除外ゾーン**（独立エリア、座標 `{-1,-1}`）
- マス名は「地名 + 列番号」（例: 地球1、マイア6）。地名は `constants.ts` の `PLANET_NAMES`

| 行 | 地名 | 宇宙港名 |
|---|---|---|
| 0 | 地球 | 地球宇宙港 |
| 1 | ロンウォール | ロンウォール宇宙港 |
| 2 | セレン | セレン宇宙港 |
| 3 | トア | トア宇宙港 |
| 4 | ディナール | ディナール宇宙港 |
| 5 | マイア | マイア宇宙港 |

#### 惑星編デッキ構成（全78枚・先頭36枚を配置）

能力カード（計26枚、`isAbility: true`）:

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

> 能力カードかどうかの判定はカード名（`[能力]` プレフィックス）ではなく `isAbility` フラグで行う。

### 秘密基地編（6×6）

- 6行 × 6列（行ラベル A〜F、列ラベル 1〜6）。宇宙港マスなし、全36マスにカードを配置
- 行・列ラベルは `constants.ts` の `ROW_LABELS`
- 重要拠点は内側16マス（B2〜E5 / row 1〜4・col 1〜4）にのみ配置可能。設定順に `KEY_POINT_LABELS`（エネルギー・ルーム / コンピューター・ルーム / 研究室 / 指令室）を付与

#### 秘密基地編デッキ構成（全52枚・先頭36枚を配置）

| カード名 | 枚数 |
|---|---|
| ESPコントローラーシステム | 1 |
| E.K. | 1 |
| エネルギー吸収体 | 3 |
| オーディオルーム | 1 |
| カーンの聖母 | 2 |
| 喫茶店「ダリア」 | 1 |
| キング編集室 | 1 |
| 警戒装置 [1-1] | 2 |
| 警戒装置 [1-2] | 1 |
| 警戒装置 [2-1] | 1 |
| 警戒装置 [2-2] | 1 |
| 警戒装置 [3-2] | 1 |
| 警戒装置 [3-3] | 1 |
| 警戒装置 [4-3] | 1 |
| 警戒装置 [4-4] | 1 |
| 警戒装置 [5-4] | 1 |
| 化粧室 | 1 |
| 幻覚の部屋[4] | 1 |
| 幻覚の部屋[6] | 1 |
| サイン会場 | 1 |
| 重積ヴォーティクス | 1 |
| 通路 | 10 |
| トラップ | 2 |
| ノヴァ（新星） | 1 |
| ブラックホール | 1 |
| 兵員室 | 3 |
| ホワイトホール | 1 |
| 山羊牧場 | 1 |
| ランダムテレポート | 8 |

すべて `isAbility: false`（能力カード秘匿ロジックは非適用）。

---

## 10. 秘密情報フィルタリング仕様

陣営（good/evil）自体は全プレイヤーに公開される。サーバーが受信者ごとに以下を出し分ける。

### 惑星編

| 情報 | good | evil |
|---|---|---|
| 待ち伏せマスの位置・`isAmbush` / `ambushLabel` | カードが表になった時のみ公開 | 常に公開 |
| 能力カードの名称・詳細（自分が開いて獲得） | 公開 | —（evil のフリップでは `openedBy` が記録されないため該当なし） |
| 能力カードの名称・詳細（他人が獲得／未獲得） | `name` / `content` を空文字で送信 | 常に空文字で送信 |
| 配布された能力カード（`myDealtCard`） | 常に `null` | 自分に配布された1枚のみ受信（他evilの分は非公開） |
| 獲得した能力カード（`myAcquiredCards`） | 自分が開いて表のままの能力カードのみ受信 | 常に空配列 |

### 秘密基地編

| 情報 | good | evil |
|---|---|---|
| 重要拠点の `isKeyPoint` / `keyPointLabel` | カードが表になった時のみ公開 | 常に公開 |
| 重要拠点の `name` / `content`（表示用差し替え） | 表になった時のみ重要拠点名・説明に差し替え | 常に差し替え |

### 補足

- `openedBy` はカードを**最後に表にした good プレイヤーのID**を記録する（good のフリップ時のみ更新。能力カードの名称・詳細の閲覧権と獲得判定はこの値で決まる）
- `Player.dealtCard` と `Player.socketId` はサーバー内部のみで保持し、`players` 配列からは常に除外して送信する
- `isDestroyed`（破壊状態）は秘匿対象ではなく全員に公開される

---

## 11. UI・スタイル仕様

### カラーパレット（主要）

| 用途 | カラーコード |
|---|---|
| メイン背景 | `#0a0a1a` |
| ボード背景 | `#0d1a2e` |
| カードマス背景 | `#1a1a2e` |
| アクセント（紫） | `#7b68ee` |
| good 配色 | テキスト `#6ea8fe` |
| evil 配色 | テキスト `#fe6e6e` |
| 待ち伏せ強調 | 背景 `#3d0d0d`、枠線 `#e74c3c` |
| 能力カード（表） | 枠線 `#2ecc71` |
| 情報入手カード（表） | 枠線 `#23c8e8` |
| 破壊カード（表） | 背景 `#3a0a0a`、枠線 `#8b1a1a` |
| 重要拠点カード（表） | 背景 `#3a2a0a`、枠線 `#c8960a`、文字 `#f0c040` |
| 破壊された重要拠点（表） | 背景 `#3a0a0a`、枠線 `#c8960a`（金）、文字 `#ffb04a`、内側金グロー |
| 配布カードバッジ（自分） | 枠線 `#e74c3c`、🎴アイコン |
| 除外ゾーン | 背景 `#1a0d0d`、枠線 `#5a2a2a` ダッシュ |

### プレイヤーカラー（10色）

赤 `#e74c3c` / 青 `#3498db` / 緑 `#2ecc71` / オレンジ `#f39c12` / 紫 `#9b59b6` / ティール `#1abc9c` / ピンク `#e91e63` / ディープオレンジ `#ff5722` / ブルーグレー `#607d8b` / ブラウン `#795548`

### 配布カードポップアップ（DealtCardModal）

- 背景オーバーレイ（`rgba(0,0,0,0.75)`）+ 中央カード（枠線 `#e74c3c`）
- 「あなたに配布された能力カード」バッジ・カード名（`#ffd700`）・本文（`pre-wrap`）・閉じるボタン
- オーバーレイクリックまたは閉じるボタンで閉じる

---

## 12. データフロー

### プレイヤーID の永続化

```
初回参加: UUID生成 → localStorage 保存 → player:join 送信
再接続:   localStorage から UUID 読出 → player:join → サーバーが playerId 照合 → socketId 更新・状態復元
```

### ゲーム状態のブロードキャスト

```
クライアント → socket イベント → サーバー
  → バリデーション → 状態更新
  → createFilteredGameState() で受信者ごとに陣営別フィルタリング
  → 全接続クライアントへ個別に game:state を送信
```

### 能力カード配布の秘匿フロー

```
FACTION_SETUP→AMBUSH_SETUP 移行: dealAmbushCards()
  evil 人数分の能力カードを各 evil の dealtCard に格納、残りでボード再生成

↓ createFilteredGameState()

players[].dealtCard を全員分除外して送信
受信者本人の dealtCard のみ myDealtCard として送信（good は null）
```

### プレイヤー接続状態管理

```
切断:       disconnectPlayer → isConnected=false（保持）。ホスト切断時は次の接続中へ移譲
退出(LOBBY): leaveGame → リストから削除＋ホスト移譲
リスタート: restartGame → 切断中を削除・faction/position/dealtCard リセット
終了:       endGame → 全プレイヤー削除
```

---

## 13. デプロイ仕様

### 本番環境構成

クライアントとサーバーを単一の Node.js プロセスとして Render に配置する。

```
Render Web Service
└── Node.js プロセス（server/dist/index.js）
    ├── Socket.io サーバー
    ├── Express API（/health）
    └── client/dist の静的ファイル配信（NODE_ENV=production のときのみ）
```

### 環境変数

| 変数名 | 値 | 説明 |
|---|---|---|
| `NODE_ENV` | `production` | 静的ファイル配信を有効化（クライアントは同一オリジンに接続） |
| `PORT` | Render が自動設定 | リッスンポート |

### ビルド・起動スクリプト（ルート package.json）

| スクリプト | コマンド | 説明 |
|---|---|---|
| `build` | `cd client && npm install --include=dev && npx vite build && cd ../server && npm install --include=dev && npm run build` | クライアント・サーバー両方をビルド（devDependencies が必要なため `--include=dev`） |
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
