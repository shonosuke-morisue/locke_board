# 超人ロック ボードゲーム - CLAUDE.md

> **ゲームの仕様（フェーズ・ルール・カード構成・Socket.io イベント・型定義・秘密情報フィルタリング等）は [SPEC.md](./SPEC.md) を正とする。** 本書はビルド・開発・デプロイなどの運用情報のみを最小限に記載する。

## ビルド・開発サーバーの起動コマンド

### サーバー（バックエンド）

```bash
cd server
npm install
npm run dev      # 開発サーバー起動（ts-node-dev、ポート3001）
npm run build    # TypeScriptビルド（dist/へ出力）
npm run start    # ビルド済みファイルを起動
```

### クライアント（フロントエンド）

```bash
cd client
npm install
npm run dev      # 開発サーバー起動（Vite、ポート5173）
npm run build    # プロダクションビルド（dist/へ出力）
npm run preview  # ビルド済みファイルをプレビュー
```

### 同時起動（推奨）

ターミナルを2つ開いて、それぞれでサーバーとクライアントを起動する。

```
# ターミナル1
cd server && npm install && npm run dev

# ターミナル2
cd client && npm install && npm run dev
```

ブラウザで `http://localhost:5173` にアクセスする。

### 修正後のサーバー再起動

コードを修正した後は必ずサーバーを手動で再起動すること。
ts-node-dev はファイル保存のたびに再コンパイルするため、複数ファイルを連続編集すると中間状態でコンパイルエラーになることがある。

```bash
# 3001番ポートを解放してサーバーを再起動
kill $(lsof -ti:3001) && cd server && npm run dev
```

クライアント（Vite）はホットリロードで自動更新されるが、プロセスが落ちた場合は再起動が必要。

---

## 本番環境（Render）へのデプロイ

ルートの `package.json` にビルド・起動スクリプトが定義されている。ビルド時は `--include=dev` オプションが必要（Vite などの devDependencies を使うため）。

本番環境では `NODE_ENV=production` を設定して起動する。このとき：
- サーバーが `client/dist` を静的ファイルとして配信する（SPA対応）
- クライアントは同一オリジンのサーバーに接続する（開発時は `hostname:3001` に接続）

詳細は [SPEC.md「13. デプロイ仕様」](./SPEC.md#13-デプロイ仕様) を参照。

---

## アーキテクチャの概要

```
locke_board/
├── package.json              # ルートのビルド・起動スクリプト（Render用）
├── SPEC.md                   # ゲーム仕様書（正）
├── client/                   # Reactフロントエンド（Vite + TypeScript）
│   ├── public/               # favicon.svg / apple-touch-icon.png
│   └── src/
│       ├── App.tsx           # ルートコンポーネント（フェーズ切り替え）
│       ├── constants.ts      # 共通定数（PLANET_NAMES, ROW_LABELS, KEY_POINT_LABELS）
│       ├── hooks/            # useSocket / useTouchTap / useTouchDrag
│       ├── types/game.ts     # 型定義（サーバーと共通）
│       └── components/       # 各画面・カード・コマ・DealtCardModal 等
│
└── server/                   # Node.jsバックエンド（Express + Socket.io）
    └── src/
        ├── index.ts          # サーバーエントリーポイント
        ├── types.ts          # 型定義
        ├── gameState.ts      # ゲーム状態管理・カード定義
        └── socketHandlers.ts # Socket.ioイベントハンドラー
```

### 設計方針

- **シングルルーム**: サーバーは1つのゲームセッションのみ管理する
- **秘密情報フィルタリング**: サーバーが各クライアントの陣営に応じてゲーム状態をフィルタリングして送信する（陣営自体は公開情報。秘匿対象は待ち伏せ・能力カードの中身・重要拠点・配布された能力カード）
- **リアルタイム同期**: カード操作・コマ移動は即座に全プレイヤーへ反映する
- **外部UIライブラリ不使用**: スタイルはインラインスタイルのみ
- **プレイヤーID永続化**: `localStorage` にプレイヤー情報を保存し、リロード時に自動再接続する

各機能の詳細な仕様は [SPEC.md](./SPEC.md) を参照すること。
