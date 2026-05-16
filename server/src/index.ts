// サーバーエントリーポイント

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import { createInitialGameState } from './gameState';
import { setupSocketHandlers } from './socketHandlers';

const PORT = process.env.PORT || 3001;

// Expressアプリケーションの初期化
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// HTTPサーバーの作成
const httpServer = createServer(app);

// Socket.ioサーバーの作成（ローカルネットワーク内の任意のオリジンを許可）
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// シングルルームのゲーム状態を初期化
const gameState = createInitialGameState();

// ヘルスチェックエンドポイント
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    phase: gameState.phase,
    players: gameState.players.length,
  });
});

// Socket.ioハンドラーの設定
setupSocketHandlers(io, gameState);

// 本番環境ではクライアントのビルド済みファイルを配信する
// （server/dist/index.js から見て ../../client/dist）
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// サーバー起動
httpServer.listen(PORT, () => {
  console.log(`🚀 超人ロックボードゲームサーバー起動`);
  console.log(`   Port: ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
});
