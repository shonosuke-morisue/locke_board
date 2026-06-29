// ロビー画面コンポーネント
// プレイヤーが名前を入力して参加待ちする画面

import React, { useState } from 'react';
import { GameState, Player } from '../types/game';

// localStorageから保存済みの名前を取得する
function getSavedName(): string {
  try {
    const stored = localStorage.getItem('locke_board_player');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.name ?? '';
    }
  } catch {
    // 読み取り失敗時は空文字
  }
  return '';
}

interface LobbyProps {
  gameState: GameState;
  onJoin: (name: string) => void;
  onLeave: () => void;
  onApprove: (playerId: string) => void;
  onStartFactionSetup: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  gameState,
  onJoin,
  onLeave,
  onApprove,
  onStartFactionSetup,
}) => {
  // 保存済みの名前を初期値としてセット
  const [playerName, setPlayerName] = useState(getSavedName);

  // 自分がすでに参加しているか確認
  const myself = gameState.players.find((p) => p.id === gameState.myId);
  const isHost = myself?.isHost ?? false;
  const hasJoined = !!myself;

  // 未承認のプレイヤーリスト（ホスト以外）
  const pendingPlayers = gameState.players.filter(
    (p) => !p.isApproved && !p.isHost
  );

  // 承認済みプレイヤーリスト
  const approvedPlayers = gameState.players.filter((p) => p.isApproved);

  // ゲーム開始可能か（ホストかつ2人以上承認済み）
  const canStart = isHost && approvedPlayers.length >= 2;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onJoin(playerName.trim());
      setPlayerName('');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>超人ロック ボードゲーム</h1>
      <p style={styles.subtitle}>リアルタイムマルチプレイヤー</p>

      {/* 操作マニュアルへのリンク（別タブで開く） */}
      <div style={styles.manualLinkRow}>
        <a
          href="/manual/index.html"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.manualLink}
        >
          📖 操作マニュアルを見る
        </a>
      </div>

      {/* 参加フォーム */}
      {!hasJoined && (
        <form onSubmit={handleJoin} style={styles.form}>
          <h2 style={styles.sectionTitle}>ゲームに参加</h2>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="プレイヤー名を入力..."
              maxLength={20}
              style={styles.input}
            />
            <button type="submit" style={styles.joinButton}>
              参加
            </button>
          </div>
        </form>
      )}

      {/* 参加済みメッセージ */}
      {hasJoined && !myself?.isApproved && (
        <div style={styles.waitingBox}>
          <p>参加申請中... ホストの承認をお待ちください。</p>
          <p style={styles.playerName}>{myself?.name}</p>
          <button onClick={onLeave} style={styles.cancelButton}>
            参加をキャンセル
          </button>
        </div>
      )}

      {hasJoined && myself?.isApproved && !isHost && (
        <div style={styles.approvedBox}>
          <p>✓ 承認されました！ゲーム開始を待っています...</p>
          <button onClick={onLeave} style={styles.cancelButton}>
            参加をキャンセル
          </button>
        </div>
      )}

      {hasJoined && myself?.isApproved && isHost && (
        <div style={styles.approvedBox}>
          <p>✓ あなたはホストです</p>
        </div>
      )}

      {/* ホスト向け: 承認待ちプレイヤー */}
      {isHost && pendingPlayers.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>参加申請中のプレイヤー</h2>
          <div style={styles.playerList}>
            {pendingPlayers.map((player: Player) => (
              <div key={player.id} style={styles.pendingPlayerRow}>
                <span
                  style={{
                    ...styles.colorDot,
                    backgroundColor: player.color,
                  }}
                />
                <span style={styles.playerName}>{player.name}</span>
                <button
                  onClick={() => onApprove(player.id)}
                  style={styles.approveButton}
                >
                  承認
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 承認済みプレイヤー一覧 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          参加プレイヤー ({approvedPlayers.length}人)
        </h2>
        {approvedPlayers.length === 0 ? (
          <p style={styles.emptyText}>まだ参加者がいません</p>
        ) : (
          <div style={styles.playerList}>
            {approvedPlayers.map((player: Player) => (
              <div key={player.id} style={styles.playerRow}>
                <span
                  style={{
                    ...styles.colorDot,
                    backgroundColor: player.color,
                  }}
                />
                <span style={styles.playerName}>{player.name}</span>
                {player.isHost && (
                  <span style={styles.hostBadge}>ホスト</span>
                )}
                {player.id === gameState.myId && (
                  <span style={styles.meBadge}>あなた</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ホスト向け: ゲーム開始ボタン・キャンセルボタン */}
      {isHost && (
        <div style={styles.startSection}>
          <button
            onClick={onStartFactionSetup}
            disabled={!canStart}
            style={{
              ...styles.startButton,
              ...(canStart ? {} : styles.startButtonDisabled),
            }}
          >
            陣営割り当てを開始
          </button>
          {!canStart && (
            <p style={styles.hint}>
              ※ 2人以上の承認済みプレイヤーが必要です
            </p>
          )}
          <button
            onClick={() => {
              const otherPlayers = gameState.players.filter(
                (p) => p.id !== gameState.myId
              );
              const msg =
                otherPlayers.length > 0
                  ? `退出するとホストが他のプレイヤーに移譲されます。退出しますか？`
                  : '退出しますか？';
              if (window.confirm(msg)) onLeave();
            }}
            style={styles.hostCancelButton}
          >
            退出する
          </button>
        </div>
      )}
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  title: {
    fontSize: '2rem',
    textAlign: 'center',
    color: '#7b68ee',
    marginBottom: '8px',
    textShadow: '0 0 20px rgba(123, 104, 238, 0.5)',
  },
  subtitle: {
    textAlign: 'center',
    color: '#888',
    marginBottom: '20px',
  },
  manualLinkRow: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  manualLink: {
    display: 'inline-block',
    color: '#7b68ee',
    fontSize: '14px',
    textDecoration: 'none',
    padding: '8px 18px',
    borderRadius: '20px',
    border: '1px solid #3a3a5a',
    backgroundColor: '#1a1a2e',
  },
  form: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    color: '#aaa',
    marginBottom: '16px',
    borderBottom: '1px solid #333',
    paddingBottom: '8px',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    fontSize: '16px',
    padding: '12px',
  },
  joinButton: {
    backgroundColor: '#7b68ee',
    color: '#fff',
    fontSize: '16px',
    padding: '12px 24px',
  },
  waitingBox: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '24px',
    color: '#aaa',
  },
  approvedBox: {
    backgroundColor: '#0d2b0d',
    border: '1px solid #2d6a2d',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '24px',
    color: '#4caf50',
  },
  section: {
    marginBottom: '32px',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    borderRadius: '6px',
  },
  pendingPlayerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #555',
    borderRadius: '6px',
  },
  colorDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    flex: 1,
    fontSize: '15px',
  },
  hostBadge: {
    backgroundColor: '#7b68ee',
    color: '#fff',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  meBadge: {
    backgroundColor: '#333',
    color: '#aaa',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  approveButton: {
    backgroundColor: '#2ecc71',
    color: '#fff',
    fontSize: '13px',
    padding: '6px 14px',
  },
  startSection: {
    textAlign: 'center',
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  startButton: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '18px',
    padding: '14px 40px',
    borderRadius: '8px',
  },
  startButtonDisabled: {
    backgroundColor: '#555',
  },
  hint: {
    marginTop: '12px',
    color: '#666',
    fontSize: '13px',
  },
  cancelButton: {
    marginTop: '12px',
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: '13px',
    padding: '6px 16px',
    borderRadius: '6px',
    border: '1px solid #555',
  },
  hostCancelButton: {
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: '13px',
    padding: '6px 16px',
    borderRadius: '6px',
    border: '1px solid #555',
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    padding: '20px',
  },
};
