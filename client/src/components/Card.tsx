// カードコンポーネント
// 伏せ状態・表状態の切り替え、待ち伏せ表示を担当

import React from 'react';
import { CardData } from '../types/game';
import { useTouchTap } from '../hooks/useTouchTap';

interface CardProps {
  card: CardData;
  isEvil: boolean;
  onDoubleClick: () => void;
  onSelect: () => void; // 表カードをクリック/シングルタップで詳細表示
}

export const Card: React.FC<CardProps> = ({
  card,
  isEvil,
  onDoubleClick,
  onSelect,
}) => {
  const { handleDoubleClick, handleTouchStart, handleTouchEnd } = useTouchTap({
    isFaceUp: card.isFaceUp,
    onDoubleTap: onDoubleClick,
    onSingleTap: onSelect,
  });

  // カード名称（能力カードで他人が開いた場合は隠す）
  const cardTitle = card.name || '能力カード';
  const isAbilityCard = card.isAbility;

  if (!card.isFaceUp) {
    // 伏せ状態のカード（ダブルクリック / ダブルタップでめくる）
    return (
      <div
        style={{
          ...styles.card,
          ...styles.faceDown,
          ...(isEvil && card.isAmbush ? styles.ambushHint : {}),
        }}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title="ダブルクリックでカードを開く"
      >
        <span style={styles.cardBackSymbol}>PLANET<br />CARD</span>
        {isEvil && card.isAmbush && (
          <span style={styles.ambushBadge}>待{card.ambushLabel}</span>
        )}
      </div>
    );
  }

  // 表状態のカード（クリックで詳細表示、ダブルクリックで裏返す）
  return (
    <div
      style={{
        ...styles.card,
        ...styles.faceUp,
        ...(card.isAmbush ? styles.ambushFaceUp : isAbilityCard ? styles.abilityFaceUp : {}),
      }}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      title="クリックで詳細表示 / ダブルクリックで裏返す"
    >
      {card.isAmbush ? (
        <div style={styles.ambushContent}>
          <span style={styles.ambushIcon}>⚠</span>
          <span style={styles.ambushText}>待ち伏せ{card.ambushLabel}</span>
        </div>
      ) : (
        <div style={styles.cardContent}>
          <span style={{
            ...styles.cardTitle,
            ...(!card.isAmbush && isAbilityCard ? styles.abilityCardTitle : {}),
          }}>{cardTitle}</span>
        </div>
      )}
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  card: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '4px',
    position: 'relative',
    userSelect: 'none',
    transition: 'transform 0.1s',
  },
  faceDown: {
    backgroundColor: '#2a2a4a',
    border: '2px solid #444',
  },
  ambushHint: {
    backgroundColor: '#3a1a1a',
    border: '2px solid #8a3a3a',
  },
  faceUp: {
    backgroundColor: '#2a3a5a',
    border: '2px solid #4a6a9a',
  },
  ambushFaceUp: {
    backgroundColor: '#5a1a1a',
    border: '2px solid #e74c3c',
  },
  abilityFaceUp: {
    backgroundColor: '#1a3a1a',
    border: '2px solid #2ecc71',
  },
  cardBackSymbol: {
    fontSize: '9px',
    color: '#555',
    textAlign: 'center',
    lineHeight: 1.5,
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  ambushBadge: {
    position: 'absolute',
    top: '2px',
    right: '3px',
    fontSize: '9px',
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  cardContent: {
    padding: '4px',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: '9px',
    color: '#aac4ff',
    lineHeight: 1.3,
    wordBreak: 'break-all',
  },
  abilityCardTitle: {
    color: '#7defa7',
  },
  ambushContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  ambushIcon: {
    fontSize: '16px',
    color: '#e74c3c',
  },
  ambushText: {
    fontSize: '9px',
    color: '#e74c3c',
    fontWeight: 'bold',
  },
};
