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
}

export const PlayerPiece: React.FC<PlayerPieceProps> = ({
  player,
  isMyPiece,
  onDragStart,
  onTouchDragStart,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, player.id)}
      onTouchStart={() => onTouchDragStart?.(player.id)}
      style={{
        ...styles.piece,
        backgroundColor: player.color,
        border: isMyPiece
          ? '2px solid #fff'
          : '2px solid rgba(255,255,255,0.3)',
        cursor: 'grab',
      }}
      title={`${player.name}${isMyPiece ? ' (あなた)' : ''}`}
    >
      {/* プレイヤー名の頭文字 */}
      <span style={styles.initial}>
        {player.name.charAt(0).toUpperCase()}
      </span>
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
    flexShrink: 0,
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
