import { useCallback, useState } from 'react';
import type { GameMap } from '@srb/types';

interface UseMapHistoryResult {
  map: GameMap;
  setMap: (next: GameMap) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  historyIndex: number;
}

/**
 * Linear undo/redo for map edits.
 * Every call to setMap pushes a new entry (drag = many entries), which keeps
 * the implementation trivial at the cost of one undo per tile during a drag.
 * A future optimization would batch the drag into a single entry.
 */
export function useMapHistory(initial: GameMap | (() => GameMap)): UseMapHistoryResult {
  const [history, setHistory] = useState<GameMap[]>(() => [
    typeof initial === 'function' ? initial() : initial,
  ]);
  const [index, setIndex] = useState(0);

  const setMap = useCallback(
    (next: GameMap) => {
      setHistory((prev) => {
        // Drop any redo tail before appending.
        const truncated = prev.slice(0, index + 1);
        truncated.push(next);
        return truncated;
      });
      setIndex((i) => i + 1);
    },
    [index],
  );

  const undo = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const map = history[index];
  if (!map) {
    // Should never happen (history always has ≥1 entry), but placate TS.
    throw new Error('History index out of bounds');
  }

  return {
    map,
    setMap,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    historyLength: history.length,
    historyIndex: index,
  };
}
