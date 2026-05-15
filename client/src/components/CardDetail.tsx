// カード詳細ポップアップコンポーネント
// 表向きカードをクリックした際に詳細テキストを表示する

import React, { useEffect } from 'react';
import { CardData } from '../types/game';

interface CardDetailProps {
  card: CardData;
  onClose: () => void;
}

export const CardDetail: React.FC<CardDetailProps> = ({ card, onClose }) => {
  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // カードタイトルと本文を分離
  const lines = card.content.split('\n');
  const title = lines[0] || '';
  const body = lines.slice(1).join('\n');

  return (
    // オーバーレイ（外側クリックで閉じる）
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{
          ...styles.popup,
          ...(card.isAmbush ? styles.ambushPopup : {}),
        }}
        onClick={(e) => e.stopPropagation()} // ポップアップ内クリックは閉じない
      >
        {/* 閉じるボタン */}
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>

        {/* カードタイトル */}
        <h2 style={{
          ...styles.cardTitle,
          ...(card.isAmbush ? styles.ambushTitle : {}),
        }}>
          {card.isAmbush ? '⚠ 待ち伏せ！' : title}
        </h2>

        {/* カード本文 */}
        <div style={styles.cardBody}>
          {card.isAmbush ? (
            <p style={styles.ambushDescription}>
              このマスには待ち伏せが仕掛けられていた！
            </p>
          ) : (
            body ? (
              <p style={styles.bodyText}>{body}</p>
            ) : (
              <p style={styles.emptyBody}>テキストなし</p>
            )
          )}
        </div>

        {/* カードID（デバッグ用） */}
        <div style={styles.cardId}>
          ID: {card.id}
        </div>

        <button style={styles.okButton} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  popup: {
    backgroundColor: '#1a2440',
    border: '2px solid #4a6a9a',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '400px',
    width: '90%',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  ambushPopup: {
    backgroundColor: '#2a1010',
    border: '2px solid #e74c3c',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: '18px',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  cardTitle: {
    fontSize: '1.4rem',
    color: '#aac4ff',
    marginBottom: '16px',
    lineHeight: 1.4,
  },
  ambushTitle: {
    color: '#e74c3c',
  },
  cardBody: {
    backgroundColor: '#0d1a2e',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    minHeight: '80px',
  },
  bodyText: {
    color: '#ccc',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  ambushDescription: {
    color: '#e74c3c',
    lineHeight: 1.7,
    textAlign: 'center',
    fontSize: '16px',
  },
  emptyBody: {
    color: '#555',
    fontStyle: 'italic',
  },
  cardId: {
    fontSize: '11px',
    color: '#444',
    marginBottom: '16px',
  },
  okButton: {
    width: '100%',
    backgroundColor: '#4a6a9a',
    color: '#fff',
    fontSize: '15px',
    padding: '10px',
    borderRadius: '6px',
  },
};
