// カードコンポーネント
// 伏せ状態・表状態の切り替え、待ち伏せ表示を担当

import React, { useRef } from 'react';
import { CardData } from '../types/game';

// 長押し判定の閾値（ミリ秒）
const LONG_PRESS_DURATION = 600;

interface CardProps {
  card: CardData;
  isEvil: boolean;
  onDoubleClick: () => void;
  onLongPress: () => void;
}

export const Card: React.FC<CardProps> = ({
  card,
  isEvil,
  onDoubleClick,
  onLongPress,
}) => {
  // 長押しタイマーのref
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 長押し開始
  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      onLongPress();
      longPressTimer.current = null;
    }, LONG_PRESS_DURATION);
  };

  // 長押しキャンセル（離した・カーソルが外れた）
  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // カード名称を表示タイトルとして使用（能力カードで他人が開いた場合は隠す）
  const cardTitle = card.name || '能力カード';

  if (!card.isFaceUp) {
    // 伏せ状態のカード
    return (
      <div
        style={{
          ...styles.card,
          ...styles.faceDown,
          // evilには待ち伏せマスを視覚的に識別できるよう表示
          ...(isEvil && card.isAmbush ? styles.ambushHint : {}),
        }}
        onDoubleClick={onDoubleClick}
        title="ダブルクリックでカードを開く"
      >
        <span style={styles.cardBackSymbol}>■</span>
        {/* evilプレイヤーには待ち伏せマークを表示 */}
        {isEvil && card.isAmbush && (
          <span style={styles.ambushBadge}>待{card.ambushLabel}</span>
        )}
      </div>
    );
  }

  // 表状態のカード（長押しで詳細表示、ダブルクリックで裏返す）
  return (
    <div
      style={{
        ...styles.card,
        ...styles.faceUp,
        ...(card.isAmbush ? styles.ambushFaceUp : {}),
      }}
      onDoubleClick={onDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      title="長押しで詳細表示 / ダブルクリックで裏返す"
    >
      {card.isAmbush ? (
        // 待ち伏せカード：「待ち伏せA」「待ち伏せB」として表示
        <div style={styles.ambushContent}>
          <span style={styles.ambushIcon}>⚠</span>
          <span style={styles.ambushText}>待ち伏せ{card.ambushLabel}</span>
        </div>
      ) : (
        // 通常カード
        <div style={styles.cardContent}>
          <span style={styles.cardTitle}>{cardTitle}</span>
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
  // evilにのみ見える待ち伏せのヒント（背景色で識別）
  ambushHint: {
    backgroundColor: '#3a1a1a',
    border: '2px solid #8a3a3a',
  },
  faceUp: {
    backgroundColor: '#2a3a5a',
    border: '2px solid #4a6a9a',
  },
  // 待ち伏せカードが表になった時のスタイル
  ambushFaceUp: {
    backgroundColor: '#5a1a1a',
    border: '2px solid #e74c3c',
  },
  cardBackSymbol: {
    fontSize: '20px',
    color: '#444',
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
