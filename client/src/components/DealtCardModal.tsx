// 配布された能力カードを表示するポップアップ
// AMBUSH_SETUP・惑星編・秘密基地編で共通利用する

import React from 'react';

interface DealtCardModalProps {
  card: { name: string; content: string };
  onClose: () => void;
}

export const DealtCardModal: React.FC<DealtCardModalProps> = ({ card, onClose }) => {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={styles.badge}>あなたに配布された能力カード</div>
        <h2 style={styles.cardName}>{card.name}</h2>
        <p style={styles.cardContent}>{card.content}</p>
        <button style={styles.closeButton} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  card: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #e74c3c',
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 12px',
    borderRadius: '999px',
    marginBottom: '16px',
  },
  cardName: {
    fontSize: '1.4rem',
    color: '#ffd700',
    margin: '0 0 16px',
  },
  cardContent: {
    fontSize: '14px',
    color: '#ddd',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    textAlign: 'left',
    maxHeight: '50vh',
    overflowY: 'auto',
    marginBottom: '24px',
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '15px',
    padding: '10px 32px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
