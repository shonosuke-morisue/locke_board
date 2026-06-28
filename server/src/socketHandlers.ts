// Socket.ioのイベントハンドラー

import { Server, Socket } from 'socket.io';
import {
  ServerGameState,
  ClientToServerEvents,
  ServerToClientEvents,
} from './types';
import {
  addPlayer,
  reconnectPlayer,
  disconnectPlayer,
  leaveGame,
  restartGame,
  endGame,
  startBase,
  setKeyPoints,
  dealAmbushCards,
  rollDice,
  createFilteredGameState,
} from './gameState';

// 全クライアントにゲーム状態を送信する（陣営に応じてフィルタリング）
function broadcastGameState(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  state: ServerGameState
): void {
  // 接続中の全ソケットに個別にフィルタリングしたゲーム状態を送信
  io.sockets.sockets.forEach((socket) => {
    const filteredState = createFilteredGameState(state, socket.id);
    socket.emit('game:state', filteredState);
  });
}

// Socket.ioのイベントハンドラーを設定する
export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  state: ServerGameState
): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`プレイヤー接続: ${socket.id}`);

    // 接続時、現在のゲーム状態を送信
    const filteredState = createFilteredGameState(state, socket.id);
    socket.emit('game:state', filteredState);

    // プレイヤー参加・再接続
    socket.on('player:join', ({ name, playerId }) => {
      // playerIdで既存プレイヤーを検索（ページリロードなどによる再接続）
      const existingPlayer = state.players.find((p) => p.id === playerId);

      if (existingPlayer) {
        // 再接続: socketIdを更新して復帰
        reconnectPlayer(existingPlayer, socket.id);
        console.log(`プレイヤー再接続: ${existingPlayer.name} (${socket.id})`);
        broadcastGameState(io, state);
        return;
      }

      // 以下は新規参加の処理

      // 名前のバリデーション
      if (!name || name.trim().length === 0) {
        socket.emit('error', { message: '名前を入力してください。' });
        return;
      }

      if (state.players.length >= 10) {
        socket.emit('error', { message: '参加人数が上限（10人）に達しています。' });
        return;
      }

      // 新規参加はLOBBYフェーズのみ許可
      if (state.phase !== 'LOBBY') {
        socket.emit('error', { message: 'ゲームはすでに開始されています。新規参加できません。' });
        return;
      }

      addPlayer(state, socket.id, name.trim(), playerId);
      console.log(`プレイヤー新規参加: ${name} (playerId: ${playerId})`);
      broadcastGameState(io, state);
    });

    // プレイヤー退出（LOBBYフェーズのみ）
    socket.on('player:leave', () => {
      if (state.phase !== 'LOBBY') {
        socket.emit('error', { message: 'ゲーム開始後は退出できません。' });
        return;
      }

      const player = state.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      console.log(`プレイヤー退出: ${player.name}`);
      leaveGame(state, socket.id);
      broadcastGameState(io, state);
    });

    // プレイヤー承認（ホストのみ）
    socket.on('player:approve', ({ playerId }) => {
      const host = state.players.find((p) => p.socketId === socket.id);
      if (!host?.isHost) {
        socket.emit('error', { message: 'ホストのみが承認できます。' });
        return;
      }

      const target = state.players.find((p) => p.id === playerId);
      if (!target) {
        socket.emit('error', { message: '指定されたプレイヤーが見つかりません。' });
        return;
      }

      target.isApproved = true;
      console.log(`プレイヤー承認: ${target.name}`);
      broadcastGameState(io, state);
    });

    // 陣営割り当て（ホストのみ、FACTION_SETUPフェーズ）
    socket.on('faction:assign', ({ playerId, faction }) => {
      const host = state.players.find((p) => p.socketId === socket.id);
      if (!host?.isHost) {
        socket.emit('error', { message: 'ホストのみが陣営を割り当てられます。' });
        return;
      }

      if (state.phase !== 'FACTION_SETUP') {
        socket.emit('error', { message: '陣営割り当てフェーズではありません。' });
        return;
      }

      const target = state.players.find((p) => p.id === playerId);
      if (!target) {
        socket.emit('error', { message: '指定されたプレイヤーが見つかりません。' });
        return;
      }

      target.faction = faction;
      console.log(`陣営割り当て: ${target.name} → ${faction}`);
      broadcastGameState(io, state);
    });

    // 陣営割り当て完了（ホストのみ）
    // LOBBYフェーズでは → FACTION_SETUP、FACTION_SETUPフェーズでは → AMBUSH_SETUP
    socket.on('faction:done', () => {
      const host = state.players.find((p) => p.socketId === socket.id);
      if (!host?.isHost) {
        socket.emit('error', { message: 'ホストのみが操作できます。' });
        return;
      }

      // LOBBYフェーズから陣営割り当てフェーズに移行
      if (state.phase === 'LOBBY') {
        const approvedPlayers = state.players.filter((p) => p.isApproved);
        if (approvedPlayers.length < 2) {
          socket.emit('error', { message: '2人以上の承認済みプレイヤーが必要です。' });
          return;
        }
        state.phase = 'FACTION_SETUP';
        console.log('フェーズ移行: LOBBY → FACTION_SETUP');
        broadcastGameState(io, state);
        return;
      }

      if (state.phase !== 'FACTION_SETUP') {
        socket.emit('error', { message: '陣営割り当てフェーズではありません。' });
        return;
      }

      // 全承認済みプレイヤーに陣営が割り当てられているか確認
      const approvedPlayers = state.players.filter((p) => p.isApproved);
      const unassigned = approvedPlayers.filter((p) => !p.faction);
      if (unassigned.length > 0) {
        socket.emit('error', {
          message: `陣営が未割り当てのプレイヤーがいます: ${unassigned.map((p) => p.name).join(', ')}`,
        });
        return;
      }

      // evilプレイヤーが存在するか確認
      const evilPlayers = approvedPlayers.filter((p) => p.faction === 'evil');
      if (evilPlayers.length === 0) {
        socket.emit('error', { message: 'evilプレイヤーが1人以上必要です。' });
        return;
      }

      // 各evilプレイヤーに能力カードを1枚配布し、配布分を除いた残りでボードを再生成してから AMBUSH_SETUP へ移行
      dealAmbushCards(state);
      state.phase = 'AMBUSH_SETUP';
      console.log('フェーズ移行: FACTION_SETUP → AMBUSH_SETUP');
      broadcastGameState(io, state);
    });

    // 待ち伏せ設定（evilプレイヤーのみ、AMBUSH_SETUPフェーズ）
    socket.on('ambush:set', ({ positions }) => {
      const player = state.players.find((p) => p.socketId === socket.id);
      if (player?.faction !== 'evil') {
        socket.emit('error', { message: 'evilプレイヤーのみが待ち伏せを設定できます。' });
        return;
      }

      if (state.phase !== 'AMBUSH_SETUP') {
        socket.emit('error', { message: '待ち伏せ設定フェーズではありません。' });
        return;
      }

      // 0〜2箇所のバリデーション（クリックごとに中間状態も送信される）
      if (!positions || positions.length > 2) {
        socket.emit('error', { message: '待ち伏せは最大2箇所です。' });
        return;
      }

      // 位置のバリデーション（宇宙港マスは不可）
      for (const pos of positions) {
        if (pos.row < 0 || pos.row >= 6 || pos.col < 1 || pos.col >= 7) {
          socket.emit('error', { message: '無効なマス位置です（宇宙港マスは選択不可）。' });
          return;
        }
      }

      // 重複チェック
      if (positions.length === 2 &&
          positions[0].row === positions[1].row &&
          positions[0].col === positions[1].col) {
        socket.emit('error', { message: '異なる2箇所を選択してください。' });
        return;
      }

      // 待ち伏せフラグをすべてリセットしてから再設定
      state.board.forEach((row) => {
        row.forEach((cell) => {
          if (cell.card) {
            cell.card.isAmbush = false;
            cell.card.ambushLabel = null;
          }
        });
      });

      // 待ち伏せを設定（1箇所目→A、2箇所目→B）
      const labels: Array<'A' | 'B'> = ['A', 'B'];
      state.ambushPositions = positions;
      positions.forEach(({ row, col }, index) => {
        const card = state.board[row][col].card;
        if (card) {
          card.isAmbush = true;
          card.ambushLabel = labels[index];
        }
      });

      console.log(`待ち伏せ設定: ${JSON.stringify(positions)}`);
      broadcastGameState(io, state);
    });

    // 待ち伏せ設定完了（evilプレイヤーのみ）
    socket.on('ambush:done', () => {
      const player = state.players.find((p) => p.socketId === socket.id);
      if (player?.faction !== 'evil') {
        socket.emit('error', { message: 'evilプレイヤーのみが操作できます。' });
        return;
      }

      if (state.phase !== 'AMBUSH_SETUP') {
        socket.emit('error', { message: '待ち伏せ設定フェーズではありません。' });
        return;
      }

      if (state.ambushPositions.length !== 2) {
        socket.emit('error', { message: '待ち伏せを2箇所設定してください。' });
        return;
      }

      // PLAYINGフェーズに移行
      state.phase = 'PLAYING';

      // goodプレイヤーのみ宇宙港（列0）に配置（evilは配置しない）
      const goodPlayers = state.players.filter((p) => p.isApproved && p.faction === 'good');
      goodPlayers.forEach((player, index) => {
        player.position = { row: index % 6, col: 0 };
      });

      console.log('フェーズ移行: AMBUSH_SETUP → PLAYING');
      broadcastGameState(io, state);
    });

    // コマ移動（PLAYING / BASE_PLAYING 両フェーズ対応）
    socket.on('piece:move', ({ playerId, row, col }) => {
      if (state.phase !== 'PLAYING' && state.phase !== 'BASE_PLAYING') {
        socket.emit('error', { message: 'ゲームプレイフェーズではありません。' });
        return;
      }

      // 位置のバリデーション（除外ゾーン { row: -1, col: -1 } は特別に許可）
      const isEliminatedZone = row === -1 && col === -1;
      const maxCol = state.phase === 'PLAYING' ? 7 : 6;
      if (!isEliminatedZone && (row < 0 || row >= 6 || col < 0 || col >= maxCol)) {
        socket.emit('error', { message: '無効なマス位置です。' });
        return;
      }

      const target = state.players.find((p) => p.id === playerId);
      if (!target) {
        socket.emit('error', { message: '指定されたプレイヤーが見つかりません。' });
        return;
      }

      target.position = { row, col };
      console.log(`コマ移動: ${target.name} → (${row}, ${col})`);
      broadcastGameState(io, state);
    });

    // カードの表裏切り替え
    socket.on('card:flip', ({ row, col }) => {
      if (state.phase !== 'PLAYING') {
        socket.emit('error', { message: 'ゲームプレイフェーズではありません。' });
        return;
      }

      if (row < 0 || row >= 6 || col < 1 || col >= 7) {
        socket.emit('error', { message: '無効なマス位置です。' });
        return;
      }

      const card = state.board[row][col].card;
      if (!card) {
        socket.emit('error', { message: 'カードが存在しないマスです。' });
        return;
      }

      card.isFaceUp = !card.isFaceUp;
      // 表に返した時に開いたプレイヤーを記録（初回のみ）
      if (card.isFaceUp && card.openedBy === null) {
        const flipPlayer = state.players.find((p) => p.socketId === socket.id);
        card.openedBy = flipPlayer?.id ?? null;
      }
      console.log(`カードフリップ: (${row}, ${col}) → ${card.isFaceUp ? '表' : '裏'}`);
      broadcastGameState(io, state);
    });

    // 惑星編カードの破壊（PLAYINGフェーズ）
    socket.on('card:destroy', ({ row, col }) => {
      if (state.phase !== 'PLAYING') {
        socket.emit('error', { message: 'ゲームプレイフェーズではありません。' });
        return;
      }
      if (row < 0 || row >= 6 || col < 1 || col >= 7) {
        socket.emit('error', { message: '無効なマス位置です。' });
        return;
      }
      const card = state.board[row][col].card;
      if (!card) return;
      card.isDestroyed = true;
      console.log(`カード破壊: (${row}, ${col})`);
      broadcastGameState(io, state);
    });

    // 惑星編カードの破壊解除（PLAYINGフェーズ）
    socket.on('card:restore', ({ row, col }) => {
      if (state.phase !== 'PLAYING') {
        socket.emit('error', { message: 'ゲームプレイフェーズではありません。' });
        return;
      }
      if (row < 0 || row >= 6 || col < 1 || col >= 7) {
        socket.emit('error', { message: '無効なマス位置です。' });
        return;
      }
      const card = state.board[row][col].card;
      if (!card) return;
      card.isDestroyed = false;
      console.log(`カード復元: (${row}, ${col})`);
      broadcastGameState(io, state);
    });

    // ダイスロール（参加済みプレイヤーなら誰でも可）
    socket.on('dice:roll', () => {
      const player = state.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      rollDice(state, player.name);
      console.log(`ダイスロール: ${player.name} → [${state.dice.values.join(', ')}]`);
      broadcastGameState(io, state);
    });

    // 秘密基地編へ移行（ホストのみ・PLAYINGフェーズから）
    socket.on('game:startBase', () => {
      const host = state.players.find((p) => p.socketId === socket.id);
      if (!host?.isHost) {
        socket.emit('error', { message: 'ホストのみが操作できます。' });
        return;
      }
      if (state.phase !== 'PLAYING') {
        socket.emit('error', { message: '惑星編プレイ中のみ移行できます。' });
        return;
      }
      startBase(state);
      console.log('フェーズ移行: PLAYING → BASE_SETUP');
      broadcastGameState(io, state);
    });

    // 重要拠点設定（evilのみ・BASE_SETUPフェーズ）
    socket.on('keyPoint:set', ({ positions }) => {
      const player = state.players.find((p) => p.socketId === socket.id);
      if (player?.faction !== 'evil') {
        socket.emit('error', { message: 'evilプレイヤーのみが重要拠点を設定できます。' });
        return;
      }
      if (state.phase !== 'BASE_SETUP') {
        socket.emit('error', { message: '重要拠点設定フェーズではありません。' });
        return;
      }
      if (!positions || positions.length > 4) {
        socket.emit('error', { message: '重要拠点は最大4箇所です。' });
        return;
      }
      // 最外周（A行・F行・1列・6列）は不可（row 0,5 または col 0,5）
      for (const pos of positions) {
        if (pos.row < 1 || pos.row > 4 || pos.col < 1 || pos.col > 4) {
          socket.emit('error', { message: '重要拠点は最外周（A行・F行・1列・6列）には配置できません。' });
          return;
        }
      }
      // 重複チェック
      const posSet = new Set(positions.map((p) => `${p.row}-${p.col}`));
      if (posSet.size !== positions.length) {
        socket.emit('error', { message: '同じマスを複数選択できません。' });
        return;
      }
      setKeyPoints(state, positions);
      console.log(`重要拠点設定: ${JSON.stringify(positions)}`);
      broadcastGameState(io, state);
    });

    // 重要拠点設定完了（evilのみ・4箇所必要）
    socket.on('keyPoint:done', () => {
      const player = state.players.find((p) => p.socketId === socket.id);
      if (player?.faction !== 'evil') {
        socket.emit('error', { message: 'evilプレイヤーのみが操作できます。' });
        return;
      }
      if (state.phase !== 'BASE_SETUP') {
        socket.emit('error', { message: '重要拠点設定フェーズではありません。' });
        return;
      }
      if (state.keyPointPositions.length !== 4) {
        socket.emit('error', { message: '重要拠点を4箇所設定してください。' });
        return;
      }
      state.phase = 'BASE_PLAYING';
      console.log('フェーズ移行: BASE_SETUP → BASE_PLAYING');
      broadcastGameState(io, state);
    });

    // 秘密基地カードのフリップ（BASE_PLAYINGフェーズ）
    socket.on('baseCard:flip', ({ row, col }) => {
      if (state.phase !== 'BASE_PLAYING') {
        socket.emit('error', { message: '秘密基地編プレイフェーズではありません。' });
        return;
      }
      if (!state.baseBoard || row < 0 || row >= 6 || col < 0 || col >= 6) {
        socket.emit('error', { message: '無効なマス位置です。' });
        return;
      }
      const card = state.baseBoard[row][col].card;
      if (!card) return;
      card.isFaceUp = !card.isFaceUp;
      console.log(`秘密基地カードフリップ: (${row}, ${col}) → ${card.isFaceUp ? '表' : '裏'}`);
      broadcastGameState(io, state);
    });

    // 秘密基地カードの破壊（BASE_PLAYINGフェーズ）
    socket.on('baseCard:destroy', ({ row, col }) => {
      if (state.phase !== 'BASE_PLAYING') {
        socket.emit('error', { message: '秘密基地編プレイフェーズではありません。' });
        return;
      }
      if (!state.baseBoard || row < 0 || row >= 6 || col < 0 || col >= 6) {
        socket.emit('error', { message: '無効なマス位置です。' });
        return;
      }
      const card = state.baseBoard[row][col].card;
      if (!card) return;
      card.isDestroyed = true;
      console.log(`秘密基地カード破壊: (${row}, ${col})`);
      broadcastGameState(io, state);
    });

    // 秘密基地カードの破壊解除（BASE_PLAYINGフェーズ）
    socket.on('baseCard:restore', ({ row, col }) => {
      if (state.phase !== 'BASE_PLAYING') {
        socket.emit('error', { message: '秘密基地編プレイフェーズではありません。' });
        return;
      }
      if (!state.baseBoard || row < 0 || row >= 6 || col < 0 || col >= 6) {
        socket.emit('error', { message: '無効なマス位置です。' });
        return;
      }
      const card = state.baseBoard[row][col].card;
      if (!card) return;
      card.isDestroyed = false;
      console.log(`秘密基地カード復元: (${row}, ${col})`);
      broadcastGameState(io, state);
    });

    // ゲームリスタート（ホストのみ）
    socket.on('game:restart', () => {
      const host = state.players.find((p) => p.socketId === socket.id);
      if (!host?.isHost) {
        socket.emit('error', { message: 'ホストのみがリスタートできます。' });
        return;
      }

      restartGame(state);
      console.log('ゲームリスタート');
      broadcastGameState(io, state);
    });

    // ゲーム終了（ホストのみ・全プレイヤーをリセット）
    socket.on('game:end', () => {
      const host = state.players.find((p) => p.socketId === socket.id);
      if (!host?.isHost) {
        socket.emit('error', { message: 'ホストのみがゲームを終了できます。' });
        return;
      }

      endGame(state);
      console.log('ゲーム終了（全プレイヤーリセット）');
      broadcastGameState(io, state);
    });

    // 切断時の処理（リストからは削除せず、切断状態にする）
    socket.on('disconnect', () => {
      const player = state.players.find((p) => p.socketId === socket.id);
      console.log(`プレイヤー切断: ${player?.name ?? socket.id}`);
      disconnectPlayer(state, socket.id);
      broadcastGameState(io, state);
    });
  });
}
