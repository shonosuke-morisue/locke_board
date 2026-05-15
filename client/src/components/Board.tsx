// ゲームボードコンポーネント
// 6行×7列のグリッド、ドラッグ&ドロップによるコマ移動、カードのフリップを担当

import React, { useState, useCallback } from 'react';

// 各行の地名（行インデックス順）
const PLANET_NAMES = ['地球', 'ロンウォール', 'セレン', 'トア', 'ディナール', 'マイア'];
import { GameState, Cell, CardData } from '../types/game';
import { Card } from './Card';
import { CardDetail } from './CardDetail';
import { PlayerPiece } from './PlayerPiece';

interface BoardProps {
  gameState: GameState;
  onMovePiece: (playerId: string, row: number, col: number) => void;
  onFlipCard: (row: number, col: number) => void;
  onRestart: () => void;
  onEnd: () => void;
}

export const Board: React.FC<BoardProps> = ({
  gameState,
  onMovePiece,
  onFlipCard,
  onRestart,
  onEnd,
}) => {
  const myself = gameState.players.find((p) => p.id === gameState.myId);
  const isHost = myself?.isHost ?? false;
  const isEvil = myself?.faction === 'evil';

  // 詳細表示中のカード
  const [detailCard, setDetailCard] = useState<CardData | null>(null);

  // ドラッグ中のプレイヤーID
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);

  // ドラッグオーバー中のマス
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);

  // ドラッグ開始
  const handleDragStart = useCallback(
    (e: React.DragEvent, playerId: string) => {
      setDraggingPlayerId(playerId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('playerId', playerId);
    },
    []
  );

  // ドラッグオーバー（ドロップ可能を示す）
  const handleDragOver = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverCell({ row, col });
    },
    []
  );

  // ドラッグリーブ
  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  // ドロップ（コマを移動）
  const handleDrop = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      const playerId = e.dataTransfer.getData('playerId') || draggingPlayerId;
      if (playerId) {
        onMovePiece(playerId, row, col);
      }
      setDraggingPlayerId(null);
      setDragOverCell(null);
    },
    [draggingPlayerId, onMovePiece]
  );

  // カードのダブルクリック（フリップ）
  const handleCardDoubleClick = useCallback(
    (row: number, col: number) => {
      onFlipCard(row, col);
    },
    [onFlipCard]
  );

  // カードの長押し（詳細表示）
  const handleCardLongPress = useCallback((card: CardData) => {
    if (card.isFaceUp) {
      setDetailCard(card);
    }
  }, []);

  // このマスにいるプレイヤーを取得
  const getPlayersAtCell = useCallback(
    (row: number, col: number) => {
      return gameState.players.filter(
        (p) =>
          p.isApproved &&
          p.position?.row === row &&
          p.position?.col === col
      );
    },
    [gameState.players]
  );

  // マスのスタイルを取得
  const getCellStyle = (cell: Cell): React.CSSProperties => {
    const isDragOver =
      dragOverCell?.row === cell.row && dragOverCell?.col === cell.col;

    if (cell.isSpaceport) {
      return {
        ...styles.cell,
        ...styles.spaceportCell,
        ...(isDragOver ? styles.dragOverCell : {}),
      };
    }

    return {
      ...styles.cell,
      ...styles.cardCell,
      ...(isDragOver ? styles.dragOverCell : {}),
    };
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <h2 style={styles.title}>ゲームボード</h2>
        <div style={styles.headerRight}>
          {/* 自分の陣営表示 */}
          {myself?.faction && (
            <span
              style={{
                ...styles.factionBadge,
                ...(myself.faction === 'law' ? styles.lawBadge : styles.evilBadge),
              }}
            >
              {myself.faction === 'law' ? '秩序（Law）' : '混沌（Evil）'}
            </span>
          )}
          {/* ホスト専用ボタン */}
          {isHost && (
            <div style={styles.hostButtons}>
              <button onClick={onRestart} style={styles.restartButton}>
                リスタート
              </button>
              <button
                onClick={() => {
                  if (window.confirm('ゲームを終了して全プレイヤーをリセットしますか？')) {
                    onEnd();
                  }
                }}
                style={styles.endButton}
              >
                ゲーム終了
              </button>
            </div>
          )}
        </div>
      </div>

      {/* プレイヤー一覧 */}
      <div style={styles.playerList}>
        {gameState.players
          .filter((p) => p.isApproved)
          .map((player) => (
            <div key={player.id} style={styles.playerBadge}>
              <span
                style={{
                  ...styles.colorDot,
                  backgroundColor: player.color,
                }}
              />
              <span style={styles.playerName}>{player.name}</span>
              {player.id === gameState.myId && (
                <span style={styles.meLabel}>(あなた)</span>
              )}
              {player.faction && (
                <span style={{
                  ...styles.factionLabel,
                  color: player.faction === 'law' ? '#6ea8fe' : '#fe6e6e',
                }}>
                  {player.faction === 'law' ? 'Law' : 'Evil'}
                </span>
              )}
            </div>
          ))}
      </div>

      {/* ボードグリッド */}
      <div style={styles.board}>
        {/* ボード行 */}
        {gameState.board.map((rowCells, rowIndex) => (
          <div key={rowIndex} style={styles.boardRow}>
            {rowCells.map((cell) => {
              const playersHere = getPlayersAtCell(cell.row, cell.col);
              return (
                <div
                  key={`${cell.row}-${cell.col}`}
                  style={getCellStyle(cell)}
                  onDragOver={(e) => handleDragOver(e, cell.row, cell.col)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cell.row, cell.col)}
                >
                  {/* 宇宙港マス */}
                  {cell.isSpaceport && (
                    <div style={styles.spaceportContent}>
                      <span style={styles.spaceportLabel}>
                        {PLANET_NAMES[cell.row]}宇宙港
                      </span>
                      <span style={styles.spaceportIcon}>🚀</span>
                    </div>
                  )}

                  {/* カードマス */}
                  {!cell.isSpaceport && cell.card && (
                    <div style={styles.cardWrapper}>
                      {/* マス名ラベル */}
                      <div style={styles.cellLabel}>
                        {PLANET_NAMES[cell.row]}{cell.col}
                      </div>
                      <Card
                        card={cell.card}
                        isEvil={isEvil}
                        onDoubleClick={() =>
                          handleCardDoubleClick(cell.row, cell.col)
                        }
                        onLongPress={() => handleCardLongPress(cell.card!)}
                      />
                    </div>
                  )}

                  {/* このマスにいるコマ */}
                  {playersHere.length > 0 && (
                    <div style={styles.piecesContainer}>
                      {playersHere.map((player) => (
                        <PlayerPiece
                          key={player.id}
                          player={player}
                          isMyPiece={player.id === gameState.myId}
                          onDragStart={handleDragStart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 操作説明 */}
      <div style={styles.instructions}>
        <p>コマ: ドラッグ&ドロップで移動 | カード: ダブルクリックで表裏切替 | 表カード: 長押しで詳細表示</p>
      </div>

      {/* カード詳細ポップアップ */}
      {detailCard && (
        <CardDetail
          card={detailCard}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.5rem',
    color: '#7b68ee',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  factionBadge: {
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '14px',
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
  hostButtons: {
    display: 'flex',
    gap: '8px',
  },
  restartButton: {
    backgroundColor: '#555',
    color: '#fff',
    fontSize: '13px',
    padding: '8px 16px',
    borderRadius: '6px',
  },
  endButton: {
    backgroundColor: '#8b1a1a',
    color: '#fff',
    fontSize: '13px',
    padding: '8px 16px',
    borderRadius: '6px',
  },
  playerList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  playerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#1a1a2e',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
  },
  colorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    color: '#ddd',
  },
  meLabel: {
    color: '#888',
    fontSize: '11px',
  },
  factionLabel: {
    fontSize: '11px',
  },
  board: {
    backgroundColor: '#0d1a2e',
    border: '2px solid #2a3a5a',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  boardRow: {
    display: 'flex',
    borderBottom: '1px solid #1a2a4a',
  },
  cell: {
    flex: 1,
    minHeight: '95px',
    position: 'relative',
    borderRight: '1px solid #1a2a4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    flexDirection: 'column',
    gap: '4px',
  },
  spaceportCell: {
    backgroundColor: '#0d1530',
  },
  cardCell: {
    backgroundColor: '#1a1a2e',
  },
  dragOverCell: {
    backgroundColor: '#2a3a5a',
    outline: '2px dashed #7b68ee',
  },
  spaceportContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  spaceportIcon: {
    fontSize: '20px',
  },
  spaceportLabel: {
    fontSize: '11px',
    color: '#e8e0ff',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  cellLabel: {
    fontSize: '11px',
    color: '#e8e0ff',
    textAlign: 'center',
    lineHeight: 1.2,
    wordBreak: 'keep-all',
    marginBottom: '2px',
    flexShrink: 0,
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  cardWrapper: {
    width: '100%',
    height: '56px',
    position: 'relative',
  },
  piecesContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px',
    justifyContent: 'center',
    position: 'absolute',
    bottom: '2px',
    left: '2px',
    right: '2px',
    zIndex: 10,
  },
  instructions: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#555',
    padding: '8px',
  },
};
