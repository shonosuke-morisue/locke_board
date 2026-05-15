// サーバーエントリーポイント

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import { createInitialGameState } from './gameState';
import { setupSocketHandlers } from './socketHandlers';

const PORT = process.env.PORT || 3001;

// Expressアプリケーションの初期化
const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// HTTPサーバーの作成
const httpServer = createServer(app);

// Socket.ioサーバーの作成
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
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

// サーバー起動
httpServer.listen(PORT, () => {
  console.log(`🚀 超人ロックボードゲームサーバー起動`);
  console.log(`   Port: ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
});
