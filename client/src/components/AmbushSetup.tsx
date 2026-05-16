// 待ち伏せ設定画面コンポーネント
// evilプレイヤーがボード上の2箇所を待ち伏せに設定する

import React from 'react';
import { GameState } from '../types/game';

// 各行の地名（行インデックス順）
const PLANET_NAMES = ['地球', 'ロンウォール', 'セレン', 'トア', 'ディナール', 'マイア'];

interface AmbushSetupProps {
  gameState: GameState;
  onSetAmbush: (positions: Array<{ row: number; col: number }>) => void;
  onAmbushDone: () => void;
}

export const AmbushSetup: React.FC<AmbushSetupProps> = ({
  gameState,
  onSetAmbush,
  onAmbushDone,
}) => {
  const myself = gameState.players.find((p) => p.id === gameState.myId);
  const isEvil = myself?.faction === 'evil';

  // サーバー状態のみを正とする（ローカル状態は持たない）
  // クリックのたびに即サーバーへ送信し、全evilプレイヤーにリアルタイム同期する
  const ambushPositions: Array<{ row: number; col: number }> = [];
  if (isEvil) {
    gameState.board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.card?.isAmbush) {
          ambushPositions.push({ row: cell.row, col: cell.col });
        }
      });
    });
  }

  // マスをクリックしたときの処理（即サーバーへ送信）
  const handleCellClick = (row: number, col: number) => {
    if (!isEvil || col === 0) return;

    const isAlreadySelected = ambushPositions.some(
      (p) => p.row === row && p.col === col
    );

    if (isAlreadySelected) {
      // 選択解除：該当マスを除いたリストを送信
      onSetAmbush(ambushPositions.filter((p) => !(p.row === row && p.col === col)));
    } else if (ambushPositions.length < 2) {
      // 追加：現在のリストに新しいマスを加えて送信
      onSetAmbush([...ambushPositions, { row, col }]);
    }
    // 2箇所選択済みで別のマスをクリックしても無視
  };

  // 選択をリセットする（空リストを送信）
  const handleReset = () => {
    onSetAmbush([]);
  };

  // マスのスタイルを取得する
  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    if (col === 0) {
      return { ...styles.cell, ...styles.spaceportCell };
    }

    const isSelected = ambushPositions.some(
      (p) => p.row === row && p.col === col
    );

    if (isSelected) {
      return { ...styles.cell, ...styles.ambushCell };
    }

    return { ...styles.cell, ...styles.normalCardCell };
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>待ち伏せ設定</h1>

      {isEvil ? (
        <>
          <p style={styles.evilInstruction}>
            ボード上の2箇所を選んで待ち伏せを設定してください。
            待ち伏せマスはgoodプレイヤーには通常の伏せカードに見えます。
          </p>

          <div style={styles.status}>
            <span>
              選択中:{' '}
              <strong style={{ color: '#e74c3c' }}>
                {ambushPositions.length} / 2箇所
              </strong>
            </span>
          </div>

          {/* ボードグリッド */}
          <div style={styles.board}>
            {gameState.board.map((rowCells, rowIndex) => (
              <div key={rowIndex} style={styles.boardRow}>
                {rowCells.map((cell) => (
                  <div
                    key={`${cell.row}-${cell.col}`}
                    style={getCellStyle(cell.row, cell.col)}
                    onClick={() => handleCellClick(cell.row, cell.col)}
                  >
                    {cell.isSpaceport ? (
                      <span style={styles.spaceportLabel}>宇宙港</span>
                    ) : (
                      <>
                        <span style={styles.cellLabel}>
                          {PLANET_NAMES[cell.row]}{cell.col}
                        </span>
                        <span style={styles.cardBack}>■</span>
                        {/* 待ち伏せマスにA/Bラベルを表示 */}
                        {cell.card?.ambushLabel && (
                          <span style={styles.ambushMark}>
                            待{cell.card.ambushLabel}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ボタン */}
          <div style={styles.buttonRow}>
            <button
              onClick={handleReset}
              style={styles.resetButton}
              disabled={ambushPositions.length === 0}
            >
              リセット
            </button>
            <button
              onClick={onAmbushDone}
              disabled={ambushPositions.length !== 2}
              style={{
                ...styles.doneButton,
                ...(ambushPositions.length !== 2
                  ? styles.doneButtonDisabled
                  : {}),
              }}
            >
              設定完了 → ゲーム開始
            </button>
          </div>
        </>
      ) : (
        /* goodプレイヤーには待機メッセージを表示 */
        <div style={styles.waitingSection}>
          <div style={styles.waitingIcon}>⚔️</div>
          <p style={styles.waitingMessage}>
            evilプレイヤーが待ち伏せを設定中です...
          </p>
          <p style={styles.waitingHint}>
            もうしばらくお待ちください
          </p>
        </div>
      )}
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  title: {
    fontSize: '2rem',
    textAlign: 'center',
    color: '#e74c3c',
    marginBottom: '16px',
  },
  evilInstruction: {
    textAlign: 'center',
    color: '#aaa',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  status: {
    textAlign: 'center',
    marginBottom: '24px',
    fontSize: '16px',
  },
  board: {
    border: '2px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  boardRow: {
    display: 'flex',
    borderBottom: '1px solid #333',
  },
  cell: {
    width: 'calc(100% / 7)',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    borderRight: '1px solid #333',
    transition: 'background-color 0.2s',
    flexShrink: 0,
    flexGrow: 1,
    minHeight: '75px',
  },
  spaceportCell: {
    backgroundColor: '#0d1a2e',
    cursor: 'default',
    flexGrow: 0,
    width: 'calc(100% / 7)',
  },
  normalCardCell: {
    backgroundColor: '#1a1a2e',
  },
  ambushCell: {
    backgroundColor: '#3d0d0d',
    border: '2px solid #e74c3c',
    cursor: 'pointer',
  },
  spaceportLabel: {
    fontSize: '11px',
    color: '#e8e0ff',
    textAlign: 'center',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  cellLabel: {
    fontSize: '11px',
    color: '#e8e0ff',
    textAlign: 'center',
    lineHeight: 1.2,
    wordBreak: 'keep-all',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  cardBack: {
    fontSize: '24px',
    color: '#333',
  },
  ambushMark: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    fontSize: '10px',
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
  },
  resetButton: {
    backgroundColor: '#555',
    color: '#fff',
    fontSize: '15px',
    padding: '12px 24px',
    borderRadius: '6px',
  },
  doneButton: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '15px',
    padding: '12px 32px',
    borderRadius: '6px',
  },
  doneButtonDisabled: {
    backgroundColor: '#555',
  },
  waitingSection: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  waitingIcon: {
    fontSize: '48px',
    marginBottom: '24px',
  },
  waitingMessage: {
    fontSize: '18px',
    color: '#aaa',
    marginBottom: '12px',
  },
  waitingHint: {
    color: '#666',
  },
};
