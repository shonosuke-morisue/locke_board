// 秘密基地カードコンポーネント
// 裏面・表面・破壊状態の表示と、フリップ・コンテキストメニューの操作を担当

import React, { useRef } from 'react';
import { CardData } from '../types/game';

const DOUBLE_TAP_DURATION = 300;
const TOUCH_MOVE_THRESHOLD = 10;

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
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const lastTapTime = useRef<number>(0);
  const touchFlippedRef = useRef(false);

  // dblclick ハンドラ（タッチによるフリップ直後は無視）
  const handleDoubleClick = () => {
    if (touchFlippedRef.current) return;
    onDoubleClick();
  };

  // 右クリックでコンテキストメニュー（表向きカードのみ）
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (card.isFaceUp) {
      onContextMenu(e.clientX, e.clientY);
    }
  };

  // タッチ開始（2本指でコンテキストメニュー、1本指は通常操作）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && card.isFaceUp) {
      e.preventDefault();
      const touch = e.touches[0];
      onContextMenu(touch.clientX, touch.clientY);
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  // タッチ終了（シングルタップ / ダブルタップ判定）
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length > 0) return; // まだ指が残っている場合はスキップ
    e.preventDefault();
    if (!touchStartPos.current) return;

    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    touchStartPos.current = null;

    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) return;

    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DURATION) {
      touchFlippedRef.current = true;
      setTimeout(() => { touchFlippedRef.current = false; }, 500);
      onDoubleClick();
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
      if (card.isFaceUp) {
        onSelect();
      }
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
