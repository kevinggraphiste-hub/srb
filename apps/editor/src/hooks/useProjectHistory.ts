import { useCallback, useRef, useState } from 'react';
import type { Project } from '@srb/types';

/**
 * Project state with undo/redo history. A "stroke" is a logical action
 * boundary: painting a single tile is one stroke; a full drag paint is
 * also one stroke. The caller calls beginStroke() on pointerdown and
 * commitStroke() on pointerup — during the stroke, setProject() mutates
 * the present state without pushing to the past.
 *
 * Non-stroke mutations (rename, move, delete, new map) auto-commit:
 * they push the previous state to the past before updating.
 */

const MAX_HISTORY = 100;

interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}

interface UseProjectHistoryResult {
  project: Project;
  setProject: (next: Project | ((prev: Project) => Project)) => void;
  beginStroke: () => void;
  commitStroke: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pastSize: number;
  futureSize: number;
  /** Replaces history with a fresh project. Used for load/new project. */
  replaceAll: (next: Project) => void;
}

export function useProjectHistory(initial: () => Project): UseProjectHistoryResult {
  const [state, setState] = useState<HistoryState>(() => ({
    past: [],
    present: initial(),
    future: [],
  }));
  // True between beginStroke and commitStroke. While true, setProject
  // keeps changing present without pushing to past.
  const strokeOpenRef = useRef(false);
  const strokeSnapshotRef = useRef<Project | null>(null);

  const setProject = useCallback((next: Project | ((prev: Project) => Project)) => {
    setState((s) => {
      const nextPresent = typeof next === 'function' ? (next as (p: Project) => Project)(s.present) : next;
      if (nextPresent === s.present) return s;

      if (strokeOpenRef.current) {
        // During a stroke: keep the snapshot, just update present.
        return { past: s.past, present: nextPresent, future: s.future };
      }
      // Not in a stroke: auto-commit each change.
      const nextPast = [...s.past, s.present];
      if (nextPast.length > MAX_HISTORY) nextPast.shift();
      return { past: nextPast, present: nextPresent, future: [] };
    });
  }, []);

  const beginStroke = useCallback(() => {
    setState((s) => {
      strokeOpenRef.current = true;
      strokeSnapshotRef.current = s.present;
      return s;
    });
  }, []);

  const commitStroke = useCallback(() => {
    setState((s) => {
      strokeOpenRef.current = false;
      const snapshot = strokeSnapshotRef.current;
      strokeSnapshotRef.current = null;
      if (!snapshot || snapshot === s.present) return s;
      const nextPast = [...s.past, snapshot];
      if (nextPast.length > MAX_HISTORY) nextPast.shift();
      return { past: nextPast, present: s.present, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1]!;
      return {
        past: s.past.slice(0, -1),
        present: prev,
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0]!;
      return {
        past: [...s.past, s.present],
        present: next,
        future: s.future.slice(1),
      };
    });
  }, []);

  const replaceAll = useCallback((next: Project) => {
    setState({ past: [], present: next, future: [] });
  }, []);

  return {
    project: state.present,
    setProject,
    beginStroke,
    commitStroke,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    pastSize: state.past.length,
    futureSize: state.future.length,
    replaceAll,
  };
}
