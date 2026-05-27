// 秘密基地編ゲームボードコンポーネント
// 6行×6列のグリッド、ドラッグ&ドロップ、カードフリップ、コンテキストメニューを担当

import React, { useState, useCallback, useEffect } from 'react';
import { GameState } from '../types/game';
import { BaseCard } from './BaseCard';
import { PlayerPiece } from './PlayerPiece';
import { useTouchDrag } from '../hooks/useTouchDrag';
import { ROW_LABELS } from '../constants';

interface BaseBoardProps {
  gameState: GameState;
  onMovePiece: (playerId: string, row: number, col: number) => void;
  onFlipBaseCard: (row: number, col: number) => void;
  onDestroyBaseCard: (row: number, col: number) => void;
  onRestoreBaseCard: (row: number, col: number) => void;
  onRestart: () => void;
  onEnd: () => void;
}

// コンテキストメニューの状態
interface ContextMenuState {
  x: number;
  y: number;
  row: number;
  col: number;
  isDestroyed: boolean;
}

export const BaseBoard: React.FC<BaseBoardProps> = ({
  gameState,
  onMovePiece,
  onFlipBaseCard,
  onDestroyBaseCard,
  onRestoreBaseCard,
  onRestart,
  onEnd,
}) => {
  const myself = gameState.players.find((p) => p.id === gameState.myId);
  const isHost = myself?.isHost ?? false;

  // 詳細表示中のマス座標
  const [detailPos, setDetailPos] = useState<{ row: number; col: number } | null>(null);
  const detailCard = detailPos && gameState.baseBoard
    ? (gameState.baseBoard[detailPos.row]?.[detailPos.col]?.card ?? null)
    : null;

  // コンテキストメニュー
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ドラッグ中のプレイヤーID（マウス）
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);

  // タッチドラッグ操作（ドラッグオーバー状態の管理も含む）
  const {
    dragOverCell,
    dragOverEliminated,
    setDragOverCell,
    setDragOverEliminated,
    handleTouchDragStart,
  } = useTouchDrag(onMovePiece);

  // コンテキストメニューを外クリックで閉じる
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // ドラッグ開始
  const handleDragStart = useCallback(
    (e: React.DragEvent, playerId: string) => {
      setDraggingPlayerId(playerId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('playerId', playerId);
    },
    []
  );

  // ドラッグオーバー
  const handleDragOver = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverCell({ row, col });
    },
    [setDragOverCell]
  );

  // ドラッグリーブ
  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, [setDragOverCell]);

  // ドロップ
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
    [draggingPlayerId, onMovePiece, setDragOverCell]
  );

  // カードダブルクリック（フリップ）
  const handleCardDoubleClick = useCallback(
    (row: number, col: number) => {
      const card = gameState.baseBoard?.[row]?.[col]?.card;
      if (card && !card.isFaceUp) {
        setDetailPos({ row, col });
      }
      onFlipBaseCard(row, col);
    },
    [onFlipBaseCard, gameState.baseBoard]
  );

  // カードクリック（詳細表示）
  const handleCardSelect = useCallback((row: number, col: number) => {
    setDetailPos({ row, col });
  }, []);

  // コンテキストメニューを開く
  const handleContextMenu = useCallback(
    (row: number, col: number, x: number, y: number) => {
      const card = gameState.baseBoard?.[row]?.[col]?.card;
      if (!card) return;
      setContextMenu({ x, y, row, col, isDestroyed: card.isDestroyed });
    },
    [gameState.baseBoard]
  );

  // このマスにいるプレイヤーを取得
  const getPlayersAtCell = useCallback(
    (row: number, col: number) => {
      return gameState.players.filter(
        (p) => p.isApproved && p.position?.row === row && p.position?.col === col
      );
    },
    [gameState.players]
  );

  // 除外ゾーンにいるプレイヤー
  const eliminatedPlayers = gameState.players.filter(
    (p) => p.isApproved && p.position?.row === -1 && p.position?.col === -1
  );

  if (!gameState.baseBoard) return null;

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <h2 style={styles.title}>第2部「秘密基地編」</h2>
        <div style={styles.headerRight}>
          {myself?.faction && (
            <span
              style={{
                ...styles.factionBadge,
                ...(myself.faction === 'good' ? styles.lawBadge : styles.evilBadge),
              }}
            >
              {myself.faction === 'good' ? '秩序（Good）' : '混沌（Evil）'}
            </span>
          )}
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
              <span style={{ ...styles.colorDot, backgroundColor: player.color }} />
              <span style={styles.playerName}>{player.name}</span>
              {player.id === gameState.myId && (
                <span style={styles.meLabel}>(あなた)</span>
              )}
              {player.faction && (
                <span style={{
                  ...styles.factionLabel,
                  color: player.faction === 'good' ? '#6ea8fe' : '#fe6e6e',
                }}>
                  {player.faction === 'good' ? 'Good' : 'Evil'}
                </span>
              )}
            </div>
          ))}
      </div>

      {/* ボードエリア（グリッド + 詳細パネル） */}
      <div style={styles.boardArea}>

        {/* ボードグリッド */}
        <div style={styles.board}>
          {/* 列ヘッダー行 */}
          <div style={styles.boardRow}>
            <div style={styles.cornerCell} />
            {[1, 2, 3, 4, 5, 6].map((colNum) => (
              <div key={colNum} style={styles.colHeader}>{colNum}</div>
            ))}
          </div>

          {/* データ行 */}
          {gameState.baseBoard.map((rowCells, rowIndex) => (
            <div key={rowIndex} style={styles.boardRow}>
              {/* 行ヘッダー */}
              <div style={styles.rowHeader}>{ROW_LABELS[rowIndex]}</div>

              {rowCells.map((cell) => {
                const playersHere = getPlayersAtCell(cell.row, cell.col);
                const isDragOver =
                  dragOverCell?.row === cell.row && dragOverCell?.col === cell.col;

                return (
                  <div
                    key={`${cell.row}-${cell.col}`}
                    data-row={cell.row}
                    data-col={cell.col}
                    style={{
                      ...styles.cell,
                      ...(isDragOver ? styles.dragOverCell : {}),
                    }}
                    onDragOver={(e) => handleDragOver(e, cell.row, cell.col)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, cell.row, cell.col)}
                  >
                    {cell.card && (
                      <div style={styles.cardWrapper}>
                        <BaseCard
                          card={cell.card}
                          onDoubleClick={() => handleCardDoubleClick(cell.row, cell.col)}
                          onSelect={() => handleCardSelect(cell.row, cell.col)}
                          onContextMenu={(x, y) => handleContextMenu(cell.row, cell.col, x, y)}
                        />
                      </div>
                    )}
                    {playersHere.length > 0 && (
                      <div style={styles.piecesContainer}>
                        {playersHere.map((player) => (
                          <PlayerPiece
                            key={player.id}
                            player={player}
                            isMyPiece={player.id === gameState.myId}
                            onDragStart={handleDragStart}
                            onTouchDragStart={handleTouchDragStart}
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

        {/* 詳細パネル */}
        <div style={styles.detailPanel}>
          {detailCard ? (
            <>
              <div style={{
                ...styles.detailTitle,
                ...(detailCard.isKeyPoint ? styles.detailTitleKeyPoint : {}),
                ...(detailCard.isDestroyed ? styles.detailTitleDestroyed : {}),
              }}>
                {detailCard.isDestroyed
                  ? `${detailCard.isKeyPoint && detailCard.keyPointLabel ? detailCard.keyPointLabel : detailCard.name} 破壊`
                  : (detailCard.isKeyPoint && detailCard.keyPointLabel ? detailCard.keyPointLabel : detailCard.name)}
              </div>
              <div style={styles.detailBody}>
                {detailCard.isDestroyed ? (
                  <p style={styles.detailDestroyedText}>このカードは破壊されています。</p>
                ) : detailCard.content ? (
                  <p style={styles.detailText}>{detailCard.content}</p>
                ) : (
                  <p style={styles.detailEmpty}>テキストなし</p>
                )}
              </div>
              <div style={styles.detailId}>ID: {detailCard.id}</div>
              <button style={styles.detailCloseButton} onClick={() => setDetailPos(null)}>
                閉じる
              </button>
            </>
          ) : (
            <p style={styles.detailPlaceholder}>
              表向きカードをクリックすると詳細が表示されます
            </p>
          )}
        </div>

      </div>

      {/* 除外ゾーン */}
      <div
        data-eliminated="true"
        style={{
          ...styles.eliminatedZone,
          ...(dragOverEliminated ? styles.dragOverCell : {}),
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverEliminated(true);
        }}
        onDragLeave={() => setDragOverEliminated(false)}
        onDrop={(e) => {
          e.preventDefault();
          const playerId = e.dataTransfer.getData('playerId') || draggingPlayerId;
          if (playerId) {
            onMovePiece(playerId, -1, -1);
          }
          setDraggingPlayerId(null);
          setDragOverEliminated(false);
        }}
      >
        <span style={styles.eliminatedLabel}>除外ゾーン</span>
        <div style={styles.eliminatedPieces}>
          {eliminatedPlayers.map((player) => (
            <PlayerPiece
              key={player.id}
              player={player}
              isMyPiece={player.id === gameState.myId}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      </div>

      {/* 操作説明 */}
      <div style={styles.instructions}>
        <p>コマ: ドラッグ&ドロップで移動 | 表カード: クリックで詳細 / ダブルクリックで裏返す / 右クリック(2本指)でメニュー | 裏カード: ダブルクリックで開く</p>
      </div>

      {/* コンテキストメニュー */}
      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isDestroyed ? (
            <button
              style={styles.contextMenuItem}
              onClick={() => {
                onRestoreBaseCard(contextMenu.row, contextMenu.col);
                setContextMenu(null);
              }}
            >
              元に戻す
            </button>
          ) : (
            <button
              style={{ ...styles.contextMenuItem, ...styles.contextMenuItemDestroy }}
              onClick={() => {
                onDestroyBaseCard(contextMenu.row, contextMenu.col);
                setContextMenu(null);
              }}
            >
              破壊
            </button>
          )}
        </div>
      )}
    </div>
  );
};

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
    color: '#c8960a',
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
  boardArea: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  board: {
    flex: '1 1 0',
    minWidth: 0,
    backgroundColor: '#0d1a2e',
    border: '2px solid #3a2a0a',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  boardRow: {
    display: 'flex',
    borderBottom: '1px solid #1a2a4a',
  },
  cornerCell: {
    width: '28px',
    flexShrink: 0,
    borderRight: '1px solid #1a2a4a',
    backgroundColor: '#0d0d1e',
  },
  colHeader: {
    flex: 1,
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    color: '#888',
    borderRight: '1px solid #1a2a4a',
    backgroundColor: '#0d0d1e',
    fontWeight: 'bold',
  },
  rowHeader: {
    width: '28px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    color: '#888',
    fontWeight: 'bold',
    borderRight: '1px solid #1a2a4a',
    backgroundColor: '#0d0d1e',
  },
  cell: {
    flex: 1,
    minHeight: '80px',
    position: 'relative',
    borderRight: '1px solid #1a2a4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: '#1a1a2e',
  },
  dragOverCell: {
    backgroundColor: '#2a3a5a',
    outline: '2px dashed #c8960a',
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
  detailPanel: {
    width: '200px',
    flexShrink: 0,
    backgroundColor: '#111827',
    border: '1px solid #3a2a0a',
    borderRadius: '8px',
    padding: '16px',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#aac4ff',
    lineHeight: 1.4,
    borderBottom: '1px solid #2a3a5a',
    paddingBottom: '8px',
  },
  detailTitleKeyPoint: {
    color: '#f0c040',
  },
  detailTitleDestroyed: {
    color: '#ff6060',
  },
  detailBody: {
    flex: 1,
    backgroundColor: '#0d1a2e',
    borderRadius: '6px',
    padding: '10px',
  },
  detailText: {
    fontSize: '13px',
    color: '#ccc',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap' as const,
    margin: 0,
  },
  detailDestroyedText: {
    fontSize: '13px',
    color: '#ff6060',
    lineHeight: 1.7,
    margin: 0,
  },
  detailEmpty: {
    fontSize: '12px',
    color: '#555',
    fontStyle: 'italic' as const,
    margin: 0,
  },
  detailId: {
    fontSize: '10px',
    color: '#3a3a3a',
  },
  detailCloseButton: {
    backgroundColor: '#2a3a5a',
    color: '#aaa',
    fontSize: '12px',
    padding: '6px',
    borderRadius: '4px',
    width: '100%',
  },
  detailPlaceholder: {
    fontSize: '12px',
    color: '#444',
    textAlign: 'center' as const,
    lineHeight: 1.6,
    margin: 0,
  },
  eliminatedZone: {
    backgroundColor: '#1a0d0d',
    border: '2px dashed #5a2a2a',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minHeight: '60px',
  },
  eliminatedLabel: {
    fontSize: '13px',
    color: '#8a4a4a',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  eliminatedPieces: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  instructions: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#555',
    padding: '8px',
  },
  contextMenu: {
    position: 'fixed',
    backgroundColor: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  contextMenuItem: {
    display: 'block',
    width: '100%',
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#ddd',
    fontSize: '14px',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  contextMenuItemDestroy: {
    color: '#ff6060',
  },
};
