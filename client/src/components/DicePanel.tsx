// ダイスパネル
// サイコロ2個・ダイスロールボタン・最後のロール者を表示する。
// サーバーが生成した結果（dice）を受け取り、rollId の増加を検知して回転演出を再生する。

import React, { useEffect, useRef, useState } from 'react';
import { DiceState } from '../types/game';

interface DicePanelProps {
  dice: DiceState;
  onRoll: () => void;
}

// 回転演出の長さ（ミリ秒）
const ROLL_ANIM_MS = 800;
// 演出中に目をパラパラ切り替える間隔（ミリ秒）
const FLICKER_MS = 80;

const randomPip = () => Math.floor(Math.random() * 6) + 1;

export const DicePanel: React.FC<DicePanelProps> = ({ dice, onRoll }) => {
  const [rolling, setRolling] = useState(false);
  const [displayValues, setDisplayValues] = useState<[number, number]>(dice.values);
  // すでに表示済みの rollId（初回マウント時の演出を防ぐため現在値で初期化）
  const lastRollIdRef = useRef(dice.rollId);
  const flickerRef = useRef<number | null>(null);
  const stopRef = useRef<number | null>(null);

  useEffect(() => {
    // rollId が増えた = 新しいロールが発生した
    if (dice.rollId === lastRollIdRef.current) {
      // ロール以外の状態更新では、演出中でなければ最新の目に同期しておく
      if (!rolling) setDisplayValues(dice.values);
      return;
    }
    lastRollIdRef.current = dice.rollId;
    if (dice.rollId === 0) {
      setDisplayValues(dice.values);
      return;
    }

    // 回転演出開始：目をパラパラ切り替え → 一定時間後に確定値を表示
    setRolling(true);
    if (flickerRef.current) clearInterval(flickerRef.current);
    flickerRef.current = window.setInterval(() => {
      setDisplayValues([randomPip(), randomPip()]);
    }, FLICKER_MS);

    if (stopRef.current) clearTimeout(stopRef.current);
    stopRef.current = window.setTimeout(() => {
      if (flickerRef.current) {
        clearInterval(flickerRef.current);
        flickerRef.current = null;
      }
      setDisplayValues(dice.values);
      setRolling(false);
    }, ROLL_ANIM_MS);
  }, [dice.rollId, dice.values, rolling]);

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (flickerRef.current) clearInterval(flickerRef.current);
      if (stopRef.current) clearTimeout(stopRef.current);
    };
  }, []);

  return (
    <div style={styles.panel}>
      <div style={styles.title}>ダイス</div>
      <div style={styles.diceRow}>
        <DiceFace value={displayValues[0]} rolling={rolling} red />
        <DiceFace value={displayValues[1]} rolling={rolling} />
      </div>
      <button style={styles.rollButton} onClick={onRoll} disabled={rolling}>
        {rolling ? 'ロール中...' : 'ダイスロール'}
      </button>
      <div style={styles.lastRoller}>
        最後のロール: <strong style={styles.lastRollerName}>{dice.rolledByName ?? '—'}</strong>
      </div>
    </div>
  );
};

// サイコロの目（3×3グリッドのどこに点を打つか）
const PIP_LAYOUT: { [value: number]: number[] } = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// red: 赤地に白い点のサイコロにする（左側のダイス用）
const DiceFace: React.FC<{ value: number; rolling: boolean; red?: boolean }> = ({ value, rolling, red }) => {
  const pips = PIP_LAYOUT[value] ?? [];
  return (
    <div style={{ ...styles.die, ...(red ? styles.dieRed : {}), ...(rolling ? styles.dieRolling : {}) }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={styles.pipCell}>
          {pips.includes(i) ? <span style={{ ...styles.pip, ...(red ? styles.pipWhite : {}) }} /> : null}
        </span>
      ))}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    backgroundColor: '#111827',
    border: '1px solid #2a3a5a',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#aac4ff',
    alignSelf: 'flex-start',
  },
  diceRow: {
    display: 'flex',
    gap: '12px',
  },
  die: {
    width: '40px',
    height: '40px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    padding: '5px',
  },
  dieRed: {
    backgroundColor: '#c0392b',
  },
  dieRolling: {
    animation: 'diceSpin 0.4s linear infinite',
  },
  pipCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#1a1a2e',
  },
  pipWhite: {
    backgroundColor: '#fff',
  },
  rollButton: {
    backgroundColor: '#7b68ee',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 'bold',
    padding: '8px 16px',
    borderRadius: '6px',
    width: '100%',
  },
  lastRoller: {
    fontSize: '11px',
    color: '#8a93a6',
    alignSelf: 'flex-start',
  },
  lastRollerName: {
    color: '#cdd6e6',
  },
};
