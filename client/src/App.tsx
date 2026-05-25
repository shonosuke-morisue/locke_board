// アプリのルートコンポーネント
// ゲームフェーズに応じて表示するコンポーネントを切り替える

import React from 'react';
import { useSocket } from './hooks/useSocket';
import { Lobby } from './components/Lobby';
import { FactionSetup } from './components/FactionSetup';
import { AmbushSetup } from './components/AmbushSetup';
import { Board } from './components/Board';
import { BaseSetup } from './components/BaseSetup';
import { BaseBoard } from './components/BaseBoard';

const App: React.FC = () => {
  const {
    gameState,
    isConnected,
    errorMessage,
    joinGame,
    leaveGame,
    approvePlayer,
    assignFaction,
    factionDone,
    setAmbush,
    ambushDone,
    movePiece,
    flipCard,
    restartGame,
    endGame,
    startBase,
    setKeyPoint,
    keyPointDone,
    flipBaseCard,
    destroyBaseCard,
    restoreBaseCard,
    clearError,
  } = useSocket();

  return (
    <div style={styles.app}>
      {/* 接続状態インジケーター */}
      <div style={styles.connectionBar}>
        <div
          style={{
            ...styles.connectionDot,
            backgroundColor: isConnected ? '#2ecc71' : '#e74c3c',
          }}
        />
        <span style={styles.connectionText}>
          {isConnected ? 'サーバー接続中' : '接続待機中...'}
        </span>
      </div>

      {/* エラーメッセージ */}
      {errorMessage && (
        <div style={styles.errorBanner}>
          <span style={styles.errorIcon}>⚠</span>
          <span style={styles.errorText}>{errorMessage}</span>
          <button onClick={clearError} style={styles.errorClose}>
            ✕
          </button>
        </div>
      )}

      {/* ゲームフェーズに応じた画面の表示 */}
      {!gameState ? (
        // 接続前のローディング表示
        <div style={styles.loading}>
          <p>サーバーに接続中...</p>
        </div>
      ) : (
        <main style={styles.main}>
          {/* LOBBYフェーズ */}
          {gameState.phase === 'LOBBY' && (
            <Lobby
              gameState={gameState}
              onJoin={joinGame}
              onLeave={leaveGame}
              onApprove={approvePlayer}
              onStartFactionSetup={factionDone}
            />
          )}

          {/* FACTION_SETUPフェーズ */}
          {gameState.phase === 'FACTION_SETUP' && (
            <FactionSetup
              gameState={gameState}
              onAssignFaction={assignFaction}
              onFactionDone={factionDone}
            />
          )}

          {/* AMBUSH_SETUPフェーズ */}
          {gameState.phase === 'AMBUSH_SETUP' && (
            <AmbushSetup
              gameState={gameState}
              onSetAmbush={setAmbush}
              onAmbushDone={ambushDone}
            />
          )}

          {/* PLAYINGフェーズ */}
          {gameState.phase === 'PLAYING' && (
            <Board
              gameState={gameState}
              onMovePiece={movePiece}
              onFlipCard={flipCard}
              onRestart={restartGame}
              onEnd={endGame}
              onStartBase={startBase}
            />
          )}

          {/* BASE_SETUPフェーズ */}
          {gameState.phase === 'BASE_SETUP' && (
            <BaseSetup
              gameState={gameState}
              onSetKeyPoint={setKeyPoint}
              onKeyPointDone={keyPointDone}
            />
          )}

          {/* BASE_PLAYINGフェーズ */}
          {gameState.phase === 'BASE_PLAYING' && (
            <BaseBoard
              gameState={gameState}
              onMovePiece={movePiece}
              onFlipBaseCard={flipBaseCard}
              onDestroyBaseCard={destroyBaseCard}
              onRestoreBaseCard={restoreBaseCard}
              onRestart={restartGame}
              onEnd={endGame}
            />
          )}
        </main>
      )}
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#0a0a1a',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
  },
  connectionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#0d0d1e',
    borderBottom: '1px solid #1a1a2e',
    fontSize: '12px',
    color: '#666',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  connectionText: {
    color: '#555',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: '#3d0d0d',
    borderBottom: '1px solid #8a1a1a',
    color: '#ff8080',
  },
  errorIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    fontSize: '14px',
  },
  errorClose: {
    backgroundColor: 'transparent',
    color: '#ff8080',
    fontSize: '16px',
    padding: '4px 8px',
    borderRadius: '4px',
    flexShrink: 0,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#555',
    fontSize: '18px',
  },
  main: {
    flex: 1,
  },
};

export default App;
