// 獲得した能力カードの一覧ポップアップ
// good プレイヤーが惑星編で開いて獲得した能力カードをカード名リストで表示する。
// カード名クリックで説明を展開する（排他: 同時に開けるのは1枚のみ）。

import React, { useState } from 'react';

interface AcquiredCardsModalProps {
  cards: Array<{ name: string; content: string }>;
  onClose: () => void;
}

export const AcquiredCardsModal: React.FC<AcquiredCardsModalProps> = ({ cards, onClose }) => {
  // 説明を表示中のカードのインデックス（null = すべて閉じている）
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // カードが裏に戻されてリストが縮んだ場合に備え、範囲外の選択は無効化する
  const selected = openIndex !== null && openIndex < cards.length ? openIndex : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={styles.badge}>あなたが獲得した能力カード</div>
        <div style={styles.list}>
          {cards.map((c, i) => (
            <div key={i}>
              <button
                style={{
                  ...styles.nameButton,
                  ...(selected === i ? styles.nameButtonOpen : {}),
                }}
                onClick={() => setOpenIndex(selected === i ? null : i)}
              >
                <span>{c.name}</span>
                <span style={styles.arrow}>{selected === i ? '▲' : '▼'}</span>
              </button>
              {selected === i && <p style={styles.cardContent}>{c.content}</p>}
            </div>
          ))}
        </div>
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
    border: '2px solid #3498db',
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#3498db',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 12px',
    borderRadius: '999px',
    marginBottom: '16px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '55vh',
    overflowY: 'auto',
    marginBottom: '20px',
    textAlign: 'left',
  },
  nameButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    width: '100%',
    backgroundColor: '#0d1a2e',
    border: '1px solid #2a3a5a',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#ffd700',
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'left',
    cursor: 'pointer',
  },
  nameButtonOpen: {
    borderColor: '#3498db',
  },
  arrow: {
    color: '#6ea8fe',
    fontSize: '11px',
    flexShrink: 0,
  },
  cardContent: {
    fontSize: '13px',
    color: '#ddd',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    backgroundColor: '#0d1a2e',
    border: '1px solid #2a3a5a',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    padding: '10px 12px',
    margin: 0,
    maxHeight: '35vh',
    overflowY: 'auto',
  },
  closeButton: {
    backgroundColor: '#3498db',
    color: '#fff',
    fontSize: '15px',
    padding: '10px 32px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
