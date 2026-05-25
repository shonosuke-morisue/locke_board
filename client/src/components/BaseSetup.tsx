// 重要拠点設定画面コンポーネント
// evilプレイヤーが秘密基地ボードの内側16マスに4つの重要拠点を設定する

import React from 'react';
import { GameState } from '../types/game';

// 行ラベル（A〜F）
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
// 重要拠点のラベル（設定順）
const KEY_POINT_LABELS = ['エネルギー・ルーム', 'コンピューター・ルーム', '研究室', '指令室'];

interface BaseSetupProps {
  gameState: GameState;
  onSetKeyPoint: (positions: Array<{ row: number; col: number }>) => void;
  onKeyPointDone: () => void;
}

export const BaseSetup: React.FC<BaseSetupProps> = ({
  gameState,
  onSetKeyPoint,
  onKeyPointDone,
}) => {
  const myself = gameState.players.find((p) => p.id === gameState.myId);
  const isEvil = myself?.faction === 'evil';

  // サーバー状態のbaseBoardから重要拠点の位置を取得
  const keyPointPositions: Array<{ row: number; col: number }> = [];
  if (isEvil && gameState.baseBoard) {
    gameState.baseBoard.forEach((row) => {
      row.forEach((cell) => {
        if (cell.card?.isKeyPoint) {
          keyPointPositions.push({ row: cell.row, col: cell.col });
        }
      });
    });
  }

  // マスのクリック処理
  const handleCellClick = (row: number, col: number) => {
    if (!isEvil) return;
    // 最外周（A行・F行・1列・6列）は選択不可
    if (row === 0 || row === 5 || col === 0 || col === 5) return;

    const isSelected = keyPointPositions.some((p) => p.row === row && p.col === col);
    if (isSelected) {
      onSetKeyPoint(keyPointPositions.filter((p) => !(p.row === row && p.col === col)));
    } else if (keyPointPositions.length < 4) {
      onSetKeyPoint([...keyPointPositions, { row, col }]);
    }
  };

  const handleReset = () => {
    onSetKeyPoint([]);
  };

  // マスのスタイルを取得
  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const isOuter = row === 0 || row === 5 || col === 0 || col === 5;
    if (isOuter) return { ...styles.cell, ...styles.outerCell };

    const idx = keyPointPositions.findIndex((p) => p.row === row && p.col === col);
    if (idx !== -1) return { ...styles.cell, ...styles.selectedCell };

    return { ...styles.cell, ...styles.innerCell };
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>重要拠点設定</h1>

      {isEvil ? (
        <>
          <p style={styles.instruction}>
            秘密基地ボードの内側16マス（B2〜E5）に4つの重要拠点を設定してください。
            設定した順番に「エネルギー・ルーム」「コンピューター・ルーム」「研究室」「指令室」の名称が付きます。
          </p>

          <div style={styles.status}>
            <span>
              選択中:{' '}
              <strong style={{ color: '#c8960a' }}>
                {keyPointPositions.length} / 4箇所
              </strong>
            </span>
          </div>

          {/* 凡例 */}
          <div style={styles.legend}>
            {KEY_POINT_LABELS.map((label, i) => (
              <div key={i} style={styles.legendItem}>
                <span style={styles.legendIndex}>{i + 1}</span>
                <span style={styles.legendLabel}>{label}</span>
                {keyPointPositions[i] && (
                  <span style={styles.legendPos}>
                    {ROW_LABELS[keyPointPositions[i].row]}{keyPointPositions[i].col + 1}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 6x6 ボードグリッド */}
          <div style={styles.board}>
            {/* 列ヘッダー */}
            <div style={styles.boardRow}>
              <div style={styles.cornerCell} />
              {[1, 2, 3, 4, 5, 6].map((colNum) => (
                <div key={colNum} style={styles.headerCell}>{colNum}</div>
              ))}
            </div>
            {/* 各行 */}
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <div key={rowIndex} style={styles.boardRow}>
                <div style={styles.rowHeaderCell}>{ROW_LABELS[rowIndex]}</div>
                {Array.from({ length: 6 }, (_, colIndex) => {
                  const idx = keyPointPositions.findIndex(
                    (p) => p.row === rowIndex && p.col === colIndex
                  );
                  return (
                    <div
                      key={colIndex}
                      style={getCellStyle(rowIndex, colIndex)}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                    >
                      {idx !== -1 && (
                        <span style={styles.keyPointMark}>{idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ボタン */}
          <div style={styles.buttonRow}>
            <button
              onClick={handleReset}
              style={styles.resetButton}
              disabled={keyPointPositions.length === 0}
            >
              リセット
            </button>
            <button
              onClick={onKeyPointDone}
              disabled={keyPointPositions.length !== 4}
              style={{
                ...styles.doneButton,
                ...(keyPointPositions.length !== 4 ? styles.doneButtonDisabled : {}),
              }}
            >
              設定完了 → ゲーム開始
            </button>
          </div>
        </>
      ) : (
        // goodプレイヤーには待機画面
        <div style={styles.waitingSection}>
          <div style={styles.waitingIcon}>🏰</div>
          <p style={styles.waitingMessage}>
            evilプレイヤーが重要拠点を設定中です...
          </p>
          <p style={styles.waitingHint}>
            もうしばらくお待ちください
          </p>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  title: {
    fontSize: '2rem',
    textAlign: 'center',
    color: '#c8960a',
    marginBottom: '16px',
  },
  instruction: {
    textAlign: 'center',
    color: '#aaa',
    marginBottom: '16px',
    lineHeight: 1.6,
  },
  status: {
    textAlign: 'center',
    marginBottom: '16px',
    fontSize: '16px',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#1a1a2e',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  legendIndex: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#c8960a',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    flexShrink: 0,
  } as React.CSSProperties,
  legendLabel: {
    color: '#ddd',
  },
  legendPos: {
    color: '#c8960a',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  board: {
    display: 'flex',
    flexDirection: 'column',
    border: '2px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '24px',
    width: '100%',
  },
  boardRow: {
    display: 'flex',
    borderBottom: '1px solid #333',
  },
  cornerCell: {
    width: '32px',
    flexShrink: 0,
    borderRight: '1px solid #333',
    backgroundColor: '#0d0d1e',
  },
  headerCell: {
    flex: 1,
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#888',
    borderRight: '1px solid #333',
    backgroundColor: '#0d0d1e',
    fontWeight: 'bold',
  },
  rowHeaderCell: {
    width: '32px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#888',
    fontWeight: 'bold',
    borderRight: '1px solid #333',
    backgroundColor: '#0d0d1e',
  },
  cell: {
    flex: 1,
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRight: '1px solid #333',
    transition: 'background-color 0.2s',
  },
  outerCell: {
    backgroundColor: '#0d0d1e',
    cursor: 'not-allowed',
  },
  innerCell: {
    backgroundColor: '#1a1a2e',
    cursor: 'pointer',
  },
  selectedCell: {
    backgroundColor: '#3a2a0a',
    border: '2px solid #c8960a',
    cursor: 'pointer',
  },
  keyPointMark: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#c8960a',
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
    backgroundColor: '#c8960a',
    color: '#000',
    fontSize: '15px',
    padding: '12px 32px',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  doneButtonDisabled: {
    backgroundColor: '#555',
    color: '#fff',
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
