// プレイヤーコマコンポーネント
// HTML5 Drag and Drop API（デスクトップ）とTouch Events API（タブレット・スマホ）に対応

import React from 'react';
import { Player } from '../types/game';

interface PlayerPieceProps {
  player: Player;
  isMyPiece: boolean;
  onDragStart: (e: React.DragEvent, playerId: string) => void;
  // タッチドラッグ開始コールバック（iPad等のタッチデバイス用）
  onTouchDragStart?: (playerId: string) => void;
  // タッチドラッグ中かどうか（視覚フィードバック用）
  isTouchDragging?: boolean;
  // タッチ当たり判定を広げる透明な余白（px）。見た目のコマサイズは変えず、
  // 周囲を掴みやすくしたい場所（除外ゾーン等の余裕がある場所）でのみ指定する。
  // 縦方向はコンテナの高さに影響するため、横方向とは別に指定できるようにしている
  touchPaddingX?: number;
  touchPaddingY?: number;
}

export const PlayerPiece: React.FC<PlayerPieceProps> = ({
  player,
  isMyPiece,
  onDragStart,
  onTouchDragStart,
  isTouchDragging,
  touchPaddingX = 0,
  touchPaddingY = 0,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, player.id)}
      onTouchStart={() => onTouchDragStart?.(player.id)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        paddingLeft: touchPaddingX,
        paddingRight: touchPaddingX,
        paddingTop: touchPaddingY,
        paddingBottom: touchPaddingY,
        cursor: 'grab',
        touchAction: 'none', // タッチドラッグ中のページパン/スクロールを抑止（余白部分も含む）
      }}
      title={`${player.name}${isMyPiece ? ' (あなた)' : ''}`}
    >
      <div
        style={{
          ...styles.piece,
          backgroundColor: player.color,
          border: isMyPiece
            ? '2px solid #fff'
            : '2px solid rgba(255,255,255,0.3)',
          // タッチドラッグ中は半透明＋拡大で「掴んでいる」フィードバックを出す
          ...(isTouchDragging ? { opacity: 0.5, transform: 'scale(1.15)' } : {}),
        }}
      >
        {/* プレイヤー名の頭文字 */}
        <span style={styles.initial}>
          {player.name.charAt(0).toUpperCase()}
        </span>
      </div>
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  piece: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
    transition: 'transform 0.1s',
  },
  initial: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
  },
};
