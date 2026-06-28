// タップ操作のカスタムフック
// Card / BaseCard で共通するシングルタップ・ダブルタップ・2本指タップの判定ロジックを提供する

import React, { useRef } from 'react';

// ダブルタップ判定の閾値（ミリ秒）
const DOUBLE_TAP_DURATION = 300;
// タッチ移動キャンセル閾値（px）
const TOUCH_MOVE_THRESHOLD = 10;

interface UseTouchTapOptions {
  /** カードが表向きかどうか（シングルタップの有効判定に使用） */
  isFaceUp: boolean;
  /** ダブルタップ / ダブルクリック時のコールバック */
  onDoubleTap: () => void;
  /** シングルタップ時のコールバック（表向きの場合のみ呼ばれる） */
  onSingleTap: () => void;
  /** 2本指タッチ時のコールバック（省略可、BaseCard のコンテキストメニュー用） */
  onTwoFingerTap?: (x: number, y: number) => void;
}

export function useTouchTap({
  isFaceUp,
  onDoubleTap,
  onSingleTap,
  onTwoFingerTap,
}: UseTouchTapOptions) {
  // タッチ開始位置（移動キャンセル判定用）
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  // 最後にタップした時刻（ダブルタップ判定用）
  const lastTapTime = useRef<number>(0);
  // タッチによるフリップが直前に発火したかどうか
  // （iOS が後続で発火する dblclick イベントを無視するためのフラグ）
  const touchFlippedRef = useRef(false);
  // 2本指タッチ操作中かどうか（全指が離れるまで後続のタップ判定を抑止する）
  const twoFingerActiveRef = useRef(false);

  // dblclick ハンドラ（タッチによるフリップ直後は無視する）
  const handleDoubleClick = () => {
    if (touchFlippedRef.current) return;
    onDoubleTap();
  };

  // タッチ開始
  // 2本指かつ表向きの場合はコンテキストメニューを呼び出す（onTwoFingerTap が指定されている場合のみ）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (onTwoFingerTap && e.touches.length === 2 && isFaceUp) {
      e.preventDefault();
      // 2本指操作中フラグを立て、1本目で記録したタップ開始位置を破棄する
      // （これをしないと指を離した際に余分なシングルタップが誤発火する）
      twoFingerActiveRef.current = true;
      touchStartPos.current = null;
      const touch = e.touches[0];
      onTwoFingerTap(touch.clientX, touch.clientY);
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  // タッチ終了（シングルタップ / ダブルタップ判定）
  const handleTouchEnd = (e: React.TouchEvent) => {
    // まだ指が残っている場合はスキップ（2本指操作の誤検知防止）
    if (e.touches.length > 0) return;
    e.preventDefault();
    // 2本指操作後は、全指が離れた時点でタップ判定をせず状態だけリセットする
    if (twoFingerActiveRef.current) {
      twoFingerActiveRef.current = false;
      touchStartPos.current = null;
      return;
    }
    if (!touchStartPos.current) return;

    // 終了位置との差分でタップか移動かを判定
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    touchStartPos.current = null;

    // 大きく動いた場合はタップ扱いしない（スクロール等）
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) return;

    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DURATION) {
      // ダブルタップ → フリップ
      touchFlippedRef.current = true;
      setTimeout(() => { touchFlippedRef.current = false; }, 500);
      onDoubleTap();
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
      // シングルタップ: 表カードなら詳細表示
      if (isFaceUp) {
        onSingleTap();
      }
    }
  };

  return { handleDoubleClick, handleTouchStart, handleTouchEnd };
}
