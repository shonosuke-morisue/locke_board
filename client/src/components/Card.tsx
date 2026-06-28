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
  onContextMenu: (x: number, y: number) => void; // 右クリック / 2本指タッチ
}

export const Card: React.FC<CardProps> = ({
  card,
  isEvil,
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

  // カード名称（能力カードで他人が開いた場合は隠す）
  const cardTitle = card.name || '能力カード';
  const isAbilityCard = card.isAbility;
  // 情報入手カード（イベントカードのため名称は全員に公開される）
  const isInfoCard = card.name === '情報入手';

  if (!card.isFaceUp) {
    // 伏せ状態のカード（ダブルクリック / ダブルタップでめくる）
    return (
      <div
        style={{
          ...styles.card,
          ...styles.faceDown,
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
        ...(card.isDestroyed
          ? styles.destroyedFaceUp
          : card.isAmbush
          ? styles.ambushFaceUp
          : isAbilityCard
          ? styles.abilityFaceUp
          : isInfoCard
          ? styles.infoFaceUp
          : {}),
      }}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      title="クリックで詳細 / ダブルクリックで裏返す / 右クリック(2本指)でメニュー"
    >
      {card.isAmbush ? (
        <div style={styles.ambushContent}>
          <span style={styles.ambushIcon}>⚠</span>
          <span style={styles.ambushText}>
            待ち伏せ{card.ambushLabel}{card.isDestroyed ? ' 破壊' : ''}
          </span>
        </div>
      ) : (
        <div style={styles.cardContent}>
          <span style={{
            ...styles.cardTitle,
            ...(isAbilityCard
              ? styles.abilityCardTitle
              : isInfoCard
              ? styles.infoCardTitle
              : {}),
            ...(card.isDestroyed ? styles.destroyedCardTitle : {}),
          }}>{card.isDestroyed ? `${cardTitle} 破壊` : cardTitle}</span>
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
  infoFaceUp: {
    backgroundColor: '#0a3a4a',
    border: '2px solid #23c8e8',
  },
  destroyedFaceUp: {
    backgroundColor: '#3a0a0a',
    border: '2px solid #8b1a1a',
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
    // 折り返し時の行間はコンテナの行ボックス（font-size × line-height）で決まるため、
    // 文字サイズに合わせて小さく指定する（既定の16px継承を防ぐ）
    fontSize: '9px',
    lineHeight: 1.1,
  },
  cardTitle: {
    fontSize: '9px',
    color: '#aac4ff',
    lineHeight: 1.1,
    wordBreak: 'break-all',
  },
  abilityCardTitle: {
    color: '#7defa7',
  },
  infoCardTitle: {
    color: '#7defff',
  },
  destroyedCardTitle: {
    color: '#ff6060',
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
