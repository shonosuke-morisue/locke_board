// タッチドラッグ操作のカスタムフック
// Board / BaseBoard で共通するコマのタッチドラッグ&ドロップロジックを提供する

import { useState, useRef, useEffect, useCallback } from 'react';

export function useTouchDrag(
  onMovePiece: (playerId: string, row: number, col: number) => void
) {
  // タッチドラッグ中のプレイヤーID
  const [touchDraggingPlayerId, setTouchDraggingPlayerId] = useState<string | null>(null);
  // ドラッグオーバー中のマス（マウス・タッチ共通で使用するため外部に公開）
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  // 除外ゾーンのドラッグオーバー状態（同上）
  const [dragOverEliminated, setDragOverEliminated] = useState(false);
  // touchend で最新の drop target を参照するための ref
  const touchDropCellRef = useRef<{ row: number; col: number } | null>(null);
  const touchDropEliminatedRef = useRef(false);

  // タッチドラッグ開始（PlayerPiece からコールバック）
  const handleTouchDragStart = useCallback((playerId: string) => {
    setTouchDraggingPlayerId(playerId);
  }, []);

  // タッチドラッグ中のドキュメントレベルイベントリスナー
  // ※ スクロール防止のため passive: false で登録する
  useEffect(() => {
    if (!touchDraggingPlayerId) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // スクロール防止
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!el) {
        setDragOverCell(null);
        setDragOverEliminated(false);
        touchDropCellRef.current = null;
        touchDropEliminatedRef.current = false;
        return;
      }
      // data-row, data-col 属性を持つ要素（またはその祖先）を探す
      const cellEl = (el as Element).closest('[data-row]') as HTMLElement | null;
      if (cellEl?.dataset.row !== undefined && cellEl?.dataset.col !== undefined) {
        const row = parseInt(cellEl.dataset.row, 10);
        const col = parseInt(cellEl.dataset.col, 10);
        if (!isNaN(row) && !isNaN(col)) {
          setDragOverCell({ row, col });
          setDragOverEliminated(false);
          touchDropCellRef.current = { row, col };
          touchDropEliminatedRef.current = false;
          return;
        }
      }
      // 除外ゾーンをチェック
      if ((el as Element).closest('[data-eliminated]')) {
        setDragOverEliminated(true);
        setDragOverCell(null);
        touchDropCellRef.current = null;
        touchDropEliminatedRef.current = true;
        return;
      }
      setDragOverCell(null);
      setDragOverEliminated(false);
      touchDropCellRef.current = null;
      touchDropEliminatedRef.current = false;
    };

    const handleTouchEnd = () => {
      const playerId = touchDraggingPlayerId;
      if (playerId) {
        if (touchDropCellRef.current) {
          onMovePiece(playerId, touchDropCellRef.current.row, touchDropCellRef.current.col);
        } else if (touchDropEliminatedRef.current) {
          onMovePiece(playerId, -1, -1);
        }
      }
      setTouchDraggingPlayerId(null);
      setDragOverCell(null);
      setDragOverEliminated(false);
      touchDropCellRef.current = null;
      touchDropEliminatedRef.current = false;
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchDraggingPlayerId, onMovePiece]);

  return {
    dragOverCell,
    dragOverEliminated,
    setDragOverCell,
    setDragOverEliminated,
    handleTouchDragStart,
  };
}
