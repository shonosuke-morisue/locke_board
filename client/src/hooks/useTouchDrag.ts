// タッチドラッグ操作のカスタムフック
// Board / BaseBoard で共通するコマのタッチドラッグ&ドロップロジックを提供する

import { useState, useRef, useEffect, useCallback } from 'react';

export function useTouchDrag(
  onMovePiece: (playerId: string, row: number, col: number) => void
) {
  // ドラッグオーバー中のマス（マウス・タッチ共通で使用するため外部に公開）
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  // 除外ゾーンのドラッグオーバー状態（同上）
  const [dragOverEliminated, setDragOverEliminated] = useState(false);
  // タッチドラッグ中のプレイヤーID（視覚フィードバック用に外部公開）
  const [touchDraggingPlayerId, setTouchDraggingPlayerId] = useState<string | null>(null);

  // touchend で最新の drop target を参照するための ref
  const touchDropCellRef = useRef<{ row: number; col: number } | null>(null);
  const touchDropEliminatedRef = useRef(false);
  // 進行中のドラッグを即時追跡する ref（リスナを state 更新を待たず同期登録するため）
  const draggingPlayerIdRef = useRef<string | null>(null);
  // 最新の onMovePiece を保持してリスナ再登録を不要にする
  const onMovePieceRef = useRef(onMovePiece);
  useEffect(() => {
    onMovePieceRef.current = onMovePiece;
  }, [onMovePiece]);

  // タッチドラッグ開始（PlayerPiece の onTouchStart からコールバック）
  // ※ touchstart の時点で document リスナを「同期的に」登録する。
  //    旧実装は state 駆動の useEffect で登録していたため、速いタップでは
  //    再レンダー前に touchend が発火してリスナに捕捉されず、ドラッグ状態が
  //    残ってページスクロールがロックされることがあった。
  const handleTouchDragStart = useCallback((playerId: string) => {
    if (draggingPlayerIdRef.current) return; // 既にドラッグ中なら無視
    draggingPlayerIdRef.current = playerId;
    setTouchDraggingPlayerId(playerId);

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // スクロール防止
      const touch = e.touches[0];
      const el = touch ? document.elementFromPoint(touch.clientX, touch.clientY) : null;
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
      const id = draggingPlayerIdRef.current;
      if (id) {
        if (touchDropCellRef.current) {
          onMovePieceRef.current(id, touchDropCellRef.current.row, touchDropCellRef.current.col);
        } else if (touchDropEliminatedRef.current) {
          onMovePieceRef.current(id, -1, -1);
        }
      }
      draggingPlayerIdRef.current = null;
      setTouchDraggingPlayerId(null);
      setDragOverCell(null);
      setDragOverEliminated(false);
      touchDropCellRef.current = null;
      touchDropEliminatedRef.current = false;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }, []);

  return {
    dragOverCell,
    dragOverEliminated,
    touchDraggingPlayerId,
    setDragOverCell,
    setDragOverEliminated,
    handleTouchDragStart,
  };
}
