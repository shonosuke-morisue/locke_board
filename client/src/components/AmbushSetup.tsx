// 待ち伏せ設定画面コンポーネント
// evilプレイヤーがボード上の2箇所を待ち伏せに設定する

import React, { useState } from 'react';
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

  // ローカルで選択中の待ち伏せ位置（確定前）
  const [selectedPositions, setSelectedPositions] = useState<
    Array<{ row: number; col: number }>
  >([]);

  // 現在サーバーで設定済みの待ち伏せ位置
  // isAmbush=trueのカードがある位置をevilプレイヤーには表示
  const confirmedAmbushPositions: Array<{ row: number; col: number }> = [];
  if (isEvil) {
    gameState.board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.card?.isAmbush) {
          confirmedAmbushPositions.push({ row: cell.row, col: cell.col });
        }
      });
    });
  }

  // マスをクリックしたときの処理
  const handleCellClick = (row: number, col: number) => {
    if (!isEvil || col === 0) return; // evilのみ・宇宙港マス除外

    const pos = { row, col };
    const existingIndex = selectedPositions.findIndex(
      (p) => p.row === row && p.col === col
    );

    if (existingIndex !== -1) {
      // すでに選択中 → 選択解除
      setSelectedPositions((prev) => prev.filter((_, i) => i !== existingIndex));
    } else if (selectedPositions.length < 2) {
      // 2箇所まで選択可能
      const newPositions = [...selectedPositions, pos];
      setSelectedPositions(newPositions);
      if (newPositions.length === 2) {
        // 2箇所選択されたらサーバーに送信
        onSetAmbush(newPositions);
      }
    }
  };

  // 選択をリセットする
  const handleReset = () => {
    setSelectedPositions([]);
    onSetAmbush([{ row: -1, col: -1 }, { row: -1, col: -1 }]); // サーバー側もリセット
  };

  // マスの待ち伏せラベルを取得する（A/B、なければnull）
  const getAmbushLabel = (row: number, col: number, cellAmbushLabel: 'A' | 'B' | null): 'A' | 'B' | null => {
    // サーバー確定済みのラベルを優先
    if (cellAmbushLabel) return cellAmbushLabel;
    // ローカル選択中のラベル（選択順でA/B）
    const localIndex = selectedPositions.findIndex((p) => p.row === row && p.col === col);
    if (localIndex === 0) return 'A';
    if (localIndex === 1) return 'B';
    return null;
  };

  // マスのスタイルを取得する
  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    if (col === 0) {
      return { ...styles.cell, ...styles.spaceportCell };
    }

    const isSelected = selectedPositions.some(
      (p) => p.row === row && p.col === col
    );
    const isConfirmed = confirmedAmbushPositions.some(
      (p) => p.row === row && p.col === col
    );

    if (isSelected || isConfirmed) {
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
            待ち伏せマスはlawプレイヤーには通常の伏せカードに見えます。
          </p>

          <div style={styles.status}>
            <span>
              選択中:{' '}
              <strong style={{ color: '#e74c3c' }}>
                {confirmedAmbushPositions.length > 0
                  ? confirmedAmbushPositions.length
                  : selectedPositions.length}
                / 2箇所
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
                        {getAmbushLabel(cell.row, cell.col, cell.card?.ambushLabel ?? null) && (
                          <span style={styles.ambushMark}>
                            待{getAmbushLabel(cell.row, cell.col, cell.card?.ambushLabel ?? null)}
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
              disabled={
                selectedPositions.length === 0 &&
                confirmedAmbushPositions.length === 0
              }
            >
              リセット
            </button>
            <button
              onClick={onAmbushDone}
              disabled={confirmedAmbushPositions.length !== 2}
              style={{
                ...styles.doneButton,
                ...(confirmedAmbushPositions.length !== 2
                  ? styles.doneButtonDisabled
                  : {}),
              }}
            >
              設定完了 → ゲーム開始
            </button>
          </div>
        </>
      ) : (
        /* lawプレイヤーには待機メッセージを表示 */
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
