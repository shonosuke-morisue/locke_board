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

// '<br>' 区切りの表示名を改行して描画する（重要拠点の表示名用）
export const renderMultilineName = (text: string): React.ReactNode =>
  text.split('<br>').map((part, index, parts) => (
    <React.Fragment key={index}>
      {part}
      {index < parts.length - 1 && <br />}
    </React.Fragment>
  ));

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
    // 重要拠点は裏面でも赤い★を表示する（サーバー側のフィルタにより evil にのみ isKeyPoint=true が届く）
    return (
      <div
        style={styles.cardBack}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title="ダブルクリックでカードを開く"
      >
        {card.isKeyPoint && (
          <span style={styles.keyPointStar} title="重要拠点">★</span>
        )}
        <span style={styles.cardBackText}>秘密基地<br />カード</span>
      </div>
    );
  }

  // 表面（通常・重要拠点・破壊状態・破壊された重要拠点で色を変える）
  const faceStyle = card.isDestroyed && card.isKeyPoint
    ? { ...styles.cardFront, ...styles.destroyedKeyPointFront }
    : card.isDestroyed
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
          ...(card.isDestroyed && card.isKeyPoint ? styles.destroyedKeyPointTitle : {}),
        }}>
          {renderMultilineName(card.isDestroyed ? `${displayName} 破壊` : displayName)}
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
    touchAction: 'manipulation', // ダブルタップズームを抑止
    position: 'relative',
  },
  keyPointStar: {
    position: 'absolute',
    top: '2px',
    right: '4px',
    fontSize: '12px',
    color: '#ff3030',
    lineHeight: 1,
    textShadow: '0 0 2px rgba(0,0,0,0.8)',
    pointerEvents: 'none',
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
    touchAction: 'manipulation', // ダブルタップズームを抑止
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
  // 破壊された重要拠点: 破壊の赤地に重要拠点の金枠を組み合わせて差別化する
  destroyedKeyPointFront: {
    backgroundColor: '#3a0a0a',
    border: '2px solid #c8960a',
    boxShadow: 'inset 0 0 6px rgba(200, 150, 10, 0.4)',
  },
  cardContent: {
    padding: '4px',
    textAlign: 'center',
    // 折り返し時の行間はコンテナの行ボックス（font-size × line-height）で決まるため、
    // 文字サイズに合わせて小さく指定する（既定の16px継承を防ぐ）
    fontSize: '8px',
    lineHeight: 1.1,
  },
  cardTitle: {
    fontSize: '8px',
    color: '#aac4ff',
    lineHeight: 1.1,
    wordBreak: 'break-all',
  },
  keyPointTitle: {
    color: '#f0c040',
  },
  destroyedTitle: {
    color: '#ff6060',
  },
  destroyedKeyPointTitle: {
    color: '#ffb04a',
  },
};
