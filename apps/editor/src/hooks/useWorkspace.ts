import { useCallback, useEffect, useRef, useState } from 'react';
import type { SerializedDockview } from 'dockview-react';
import { genId } from '../data/blank-map';

/**
 * Workspace state: the live dockview layout (auto-persisted) plus a list
 * of named presets the user can save/apply/delete.
 */

export interface WorkspacePreset {
  id: string;
  name: string;
  layout: SerializedDockview;
}

interface StorageShape {
  current: SerializedDockview | null;
  defaultLayout: SerializedDockview | null;
  presets: WorkspacePreset[];
}

const STORAGE_KEY = 'srb-editor:workspace-v2';

function loadFromStorage(): StorageShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { current: null, defaultLayout: null, presets: [] };
    const parsed = JSON.parse(raw) as Partial<StorageShape>;
    return {
      current: (parsed.current as SerializedDockview | undefined) ?? null,
      defaultLayout: (parsed.defaultLayout as SerializedDockview | undefined) ?? null,
      presets: Array.isArray(parsed.presets) ? parsed.presets : [],
    };
  } catch {
    return { current: null, defaultLayout: null, presets: [] };
  }
}

function saveToStorage(state: StorageShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // fail silently — quota, private mode, etc.
  }
}

interface UseWorkspaceResult {
  currentLayout: SerializedDockview | null;
  defaultLayout: SerializedDockview | null;
  onLayoutChange: (layout: SerializedDockview) => void;
  presets: WorkspacePreset[];
  saveAsPreset: (name: string) => void;
  applyPreset: (presetId: string) => SerializedDockview | null;
  deletePreset: (presetId: string) => void;
  setCurrentAsDefault: () => void;
  clearDefault: () => void;
  resetToDefault: () => void;
}

export function useWorkspace(): UseWorkspaceResult {
  const [state, setState] = useState<StorageShape>(loadFromStorage);
  // Debounce writes to avoid spamming localStorage while the user drags.
  const writeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (writeTimerRef.current) window.clearTimeout(writeTimerRef.current);
    writeTimerRef.current = window.setTimeout(() => {
      saveToStorage(state);
    }, 150);
    return () => {
      if (writeTimerRef.current) window.clearTimeout(writeTimerRef.current);
    };
  }, [state]);

  const onLayoutChange = useCallback((layout: SerializedDockview) => {
    setState((s) => ({ ...s, current: layout }));
  }, []);

  const saveAsPreset = useCallback((name: string) => {
    setState((s) => {
      if (!s.current) return s;
      return {
        ...s,
        presets: [...s.presets, { id: genId('ws'), name, layout: s.current }],
      };
    });
  }, []);

  const applyPreset = useCallback(
    (presetId: string): SerializedDockview | null => {
      const preset = state.presets.find((p) => p.id === presetId);
      return preset ? preset.layout : null;
    },
    [state.presets],
  );

  const deletePreset = useCallback((presetId: string) => {
    setState((s) => ({ ...s, presets: s.presets.filter((p) => p.id !== presetId) }));
  }, []);

  const setCurrentAsDefault = useCallback((): void => {
    setState((s) => {
      if (!s.current) return s;
      return { ...s, defaultLayout: s.current };
    });
  }, []);

  const clearDefault = useCallback((): void => {
    setState((s) => ({ ...s, defaultLayout: null }));
  }, []);

  const resetToDefault = useCallback((): void => {
    setState((s) => ({ ...s, current: null }));
  }, []);

  return {
    currentLayout: state.current,
    defaultLayout: state.defaultLayout,
    onLayoutChange,
    presets: state.presets,
    saveAsPreset,
    applyPreset,
    deletePreset,
    setCurrentAsDefault,
    clearDefault,
    resetToDefault,
  };
}
