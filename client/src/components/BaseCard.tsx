// 秘密基地カードコンポーネント
// 裏面・表面・破壊状態の表示と、フリップ・コンテキストメニューの操作を担当

import React from 'react';
import { CardData } from '../types/game';
import { useTouchTap } from '../hooks/useTouchTap';

interface BaseCardProps {
  card: CardData;
  onDoubleClick: () => void;
  onSelect: () => void;
  onContextMenu: (x: number, y: number) => void; // 右クリック / 2本指タッチ
}

export const BaseCard: React.FC<BaseCardProps> = ({
  card,
  onDoubleClick,
  onSelect,
  onContextMenu,
}) => {
  const { handleDoubleClick, handleTouchStart, handleTouchEnd } = useTouchTap({
    isFaceUp: card.isFaceUp,
    onDoubleTap: onDoubleClick,
    onSingleTap: onSelect,
    onTwoFingerTap: onContextMenu,
  });

  // 右クリックでコンテキストメニュー（表向きカードのみ）
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (card.isFaceUp) {
      onContextMenu(e.clientX, e.clientY);
    }
  };

  // 表示するカード名（重要拠点はそのラベルを表示）
  const displayName = card.isKeyPoint && card.keyPointLabel
    ? card.keyPointLabel
    : card.name;

  if (!card.isFaceUp) {
    // 裏面
    return (
      <div
        style={styles.cardBack}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title="ダブルクリックでカードを開く"
      >
        <span style={styles.cardBackText}>秘密基地<br />カード</span>
      </div>
    );
  }

  // 表面（通常・重要拠点・破壊状態で色を変える）
  const faceStyle = card.isDestroyed
    ? { ...styles.cardFront, ...styles.destroyedFront }
    : card.isKeyPoint
    ? { ...styles.cardFront, ...styles.keyPointFront }
    : styles.cardFront;

  return (
    <div
      style={faceStyle}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      title="クリックで詳細 / ダブルクリックで裏返す / 右クリック(2本指)でメニュー"
    >
      <div style={styles.cardContent}>
        <span style={{
          ...styles.cardTitle,
          ...(card.isKeyPoint ? styles.keyPointTitle : {}),
          ...(card.isDestroyed ? styles.destroyedTitle : {}),
        }}>
          {card.isDestroyed ? `${displayName} 破壊` : displayName}
        </span>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  cardBack: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '4px',
    backgroundColor: '#1a1a3a',
    border: '2px solid #333',
    userSelect: 'none',
  },
  cardBackText: {
    fontSize: '8px',
    color: '#555',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: 1.5,
    letterSpacing: '0.05em',
  },
  cardFront: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '4px',
    backgroundColor: '#2a3a5a',
    border: '2px solid #4a6a9a',
    userSelect: 'none',
    position: 'relative',
  },
  keyPointFront: {
    backgroundColor: '#3a2a0a',
    border: '2px solid #c8960a',
  },
  destroyedFront: {
    backgroundColor: '#3a0a0a',
    border: '2px solid #8b1a1a',
  },
  cardContent: {
    padding: '4px',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: '8px',
    color: '#aac4ff',
    lineHeight: 1.3,
    wordBreak: 'break-all',
  },
  keyPointTitle: {
    color: '#f0c040',
  },
  destroyedTitle: {
    color: '#ff6060',
  },
};
