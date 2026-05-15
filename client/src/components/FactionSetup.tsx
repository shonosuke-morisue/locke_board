// 陣営割り当て画面コンポーネント
// ホストが各プレイヤーに good または evil の陣営を割り当てる

import React from 'react';
import { GameState, Player, Faction } from '../types/game';

interface FactionSetupProps {
  gameState: GameState;
  onAssignFaction: (playerId: string, faction: Faction) => void;
  onFactionDone: () => void;
}

export const FactionSetup: React.FC<FactionSetupProps> = ({
  gameState,
  onAssignFaction,
  onFactionDone,
}) => {
  const myself = gameState.players.find((p) => p.id === gameState.myId);
  const isHost = myself?.isHost ?? false;

  // 承認済みプレイヤーのみ対象
  const approvedPlayers = gameState.players.filter((p) => p.isApproved);

  // 全員に陣営が割り当てられているか
  const allAssigned = approvedPlayers.every((p) => p.faction);

  // 陣営ごとの人数
  const lawCount = approvedPlayers.filter((p) => p.faction === 'good').length;
  const evilCount = approvedPlayers.filter((p) => p.faction === 'evil').length;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>陣営割り当て</h1>
      <p style={styles.subtitle}>
        ホストが各プレイヤーの陣営を決定します
      </p>

      {/* 陣営カウント */}
      <div style={styles.factionCount}>
        <div style={styles.lawCount}>
          <span style={styles.factionLabel}>秩序（Good）</span>
          <span style={styles.count}>{lawCount}人</span>
        </div>
        <div style={styles.evilCount}>
          <span style={styles.factionLabel}>混沌（Evil）</span>
          <span style={styles.count}>{evilCount}人</span>
        </div>
      </div>

      {/* プレイヤー一覧と陣営割り当て */}
      <div style={styles.playerList}>
        {approvedPlayers.map((player: Player) => (
          <div key={player.id} style={styles.playerRow}>
            {/* プレイヤー情報 */}
            <div style={styles.playerInfo}>
              <span
                style={{
                  ...styles.colorDot,
                  backgroundColor: player.color,
                }}
              />
              <span style={styles.playerName}>
                {player.name}
                {player.id === gameState.myId && (
                  <span style={styles.meBadge}> (あなた)</span>
                )}
                {player.isHost && (
                  <span style={styles.hostBadge}> [ホスト]</span>
                )}
              </span>
            </div>

            {/* 陣営割り当てボタン（ホストのみ表示） */}
            {isHost ? (
              <div style={styles.factionButtons}>
                <button
                  onClick={() => onAssignFaction(player.id, 'good')}
                  style={{
                    ...styles.factionButton,
                    ...styles.lawButton,
                    ...(player.faction === 'good' ? styles.activeLawButton : {}),
                  }}
                >
                  秩序（Good）
                </button>
                <button
                  onClick={() => onAssignFaction(player.id, 'evil')}
                  style={{
                    ...styles.factionButton,
                    ...styles.evilButton,
                    ...(player.faction === 'evil' ? styles.activeEvilButton : {}),
                  }}
                >
                  混沌（Evil）
                </button>
              </div>
            ) : (
              /* 非ホストには陣営を表示（自分の陣営のみ） */
              <div style={styles.factionDisplay}>
                {player.id === gameState.myId ? (
                  player.faction ? (
                    <span
                      style={{
                        ...styles.factionBadge,
                        ...(player.faction === 'good'
                          ? styles.lawBadge
                          : styles.evilBadge),
                      }}
                    >
                      {player.faction === 'good' ? '秩序（Good）' : '混沌（Evil）'}
                    </span>
                  ) : (
                    <span style={styles.unassigned}>未割り当て</span>
                  )
                ) : (
                  <span style={styles.hidden}>???</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ホスト向け: 完了ボタン */}
      {isHost && (
        <div style={styles.doneSection}>
          <button
            onClick={onFactionDone}
            disabled={!allAssigned || evilCount === 0}
            style={{
              ...styles.doneButton,
              ...(!allAssigned || evilCount === 0 ? styles.doneButtonDisabled : {}),
            }}
          >
            割り当て完了 → 待ち伏せ設定へ
          </button>
          {!allAssigned && (
            <p style={styles.hint}>※ 全員の陣営を割り当ててください</p>
          )}
          {allAssigned && evilCount === 0 && (
            <p style={styles.hint}>※ evilプレイヤーが1人以上必要です</p>
          )}
        </div>
      )}

      {/* 非ホスト向け: 待機メッセージ */}
      {!isHost && (
        <div style={styles.waitingMessage}>
          <p>ホストが陣営を割り当て中です...</p>
        </div>
      )}
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  title: {
    fontSize: '2rem',
    textAlign: 'center',
    color: '#7b68ee',
    marginBottom: '8px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#888',
    marginBottom: '32px',
  },
  factionCount: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginBottom: '32px',
  },
  lawCount: {
    textAlign: 'center',
    padding: '16px 32px',
    backgroundColor: '#0d1f3c',
    border: '1px solid #1a4a8a',
    borderRadius: '8px',
  },
  evilCount: {
    textAlign: 'center',
    padding: '16px 32px',
    backgroundColor: '#2d0d0d',
    border: '1px solid #8a1a1a',
    borderRadius: '8px',
  },
  factionLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
  },
  count: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    gap: '16px',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  colorDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontSize: '15px',
  },
  meBadge: {
    color: '#888',
    fontSize: '12px',
  },
  hostBadge: {
    color: '#7b68ee',
    fontSize: '12px',
  },
  factionButtons: {
    display: 'flex',
    gap: '8px',
  },
  factionButton: {
    fontSize: '13px',
    padding: '8px 16px',
    opacity: 0.5,
    border: '2px solid transparent',
  },
  lawButton: {
    backgroundColor: '#1a3a6e',
    color: '#6ea8fe',
    borderColor: '#1a3a6e',
  },
  activeLawButton: {
    opacity: 1,
    borderColor: '#4a8aee',
    backgroundColor: '#1a3a6e',
  },
  evilButton: {
    backgroundColor: '#6e1a1a',
    color: '#fe6e6e',
    borderColor: '#6e1a1a',
  },
  activeEvilButton: {
    opacity: 1,
    borderColor: '#ee4a4a',
    backgroundColor: '#6e1a1a',
  },
  factionDisplay: {
    minWidth: '120px',
    textAlign: 'center',
  },
  factionBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  lawBadge: {
    backgroundColor: '#1a3a6e',
    color: '#6ea8fe',
  },
  evilBadge: {
    backgroundColor: '#6e1a1a',
    color: '#fe6e6e',
  },
  unassigned: {
    color: '#555',
    fontSize: '13px',
  },
  hidden: {
    color: '#444',
    fontSize: '18px',
    letterSpacing: '4px',
  },
  doneSection: {
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#7b68ee',
    color: '#fff',
    fontSize: '16px',
    padding: '14px 32px',
    borderRadius: '8px',
  },
  doneButtonDisabled: {
    backgroundColor: '#444',
  },
  hint: {
    marginTop: '12px',
    color: '#666',
    fontSize: '13px',
  },
  waitingMessage: {
    textAlign: 'center',
    color: '#888',
    padding: '32px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
  },
};
