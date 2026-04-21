import { useCallback, useEffect, useState } from 'react';
import { genId } from '../data/blank-map';

/** Pixel widths of the two side panels. Canvas fills the remaining space. */
export interface LayoutState {
  paletteWidth: number;
  inspectorWidth: number;
}

export const DEFAULT_LAYOUT: LayoutState = {
  paletteWidth: 220,
  inspectorWidth: 240,
};

export const MIN_PANEL_WIDTH = 160;
export const MAX_PANEL_WIDTH = 500;

export interface WorkspacePreset {
  id: string;
  name: string;
  layout: LayoutState;
}

interface StorageShape {
  current: LayoutState;
  presets: WorkspacePreset[];
}

const STORAGE_KEY = 'srb-editor:workspace';

function clampLayout(input: Partial<LayoutState> | null | undefined): LayoutState {
  const pw = input?.paletteWidth ?? DEFAULT_LAYOUT.paletteWidth;
  const iw = input?.inspectorWidth ?? DEFAULT_LAYOUT.inspectorWidth;
  return {
    paletteWidth: Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, pw)),
    inspectorWidth: Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, iw)),
  };
}

function loadFromStorage(): StorageShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { current: DEFAULT_LAYOUT, presets: [] };
    const parsed = JSON.parse(raw) as Partial<StorageShape>;
    return {
      current: clampLayout(parsed.current),
      presets: Array.isArray(parsed.presets)
        ? parsed.presets.map((p) => ({
            id: p.id,
            name: p.name,
            layout: clampLayout(p.layout),
          }))
        : [],
    };
  } catch {
    return { current: DEFAULT_LAYOUT, presets: [] };
  }
}

function saveToStorage(state: StorageShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — fail silently.
  }
}

interface UseWorkspaceResult {
  layout: LayoutState;
  setLayout: (next: LayoutState) => void;
  presets: WorkspacePreset[];
  saveAsPreset: (name: string) => void;
  applyPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  resetToDefault: () => void;
}

/**
 * Editor workspace state: live layout (persisted automatically) + a list of
 * named presets the user can save/load. All kept in localStorage.
 */
export function useWorkspace(): UseWorkspaceResult {
  const [state, setState] = useState<StorageShape>(loadFromStorage);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const setLayout = useCallback((next: LayoutState) => {
    setState((s) => ({ ...s, current: clampLayout(next) }));
  }, []);

  const saveAsPreset = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      presets: [...s.presets, { id: genId('ws'), name, layout: clampLayout(s.current) }],
    }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    setState((s) => {
      const preset = s.presets.find((p) => p.id === presetId);
      if (!preset) return s;
      return { ...s, current: clampLayout(preset.layout) };
    });
  }, []);

  const deletePreset = useCallback((presetId: string) => {
    setState((s) => ({ ...s, presets: s.presets.filter((p) => p.id !== presetId) }));
  }, []);

  const resetToDefault = useCallback(() => {
    setState((s) => ({ ...s, current: DEFAULT_LAYOUT }));
  }, []);

  return {
    layout: state.current,
    setLayout,
    presets: state.presets,
    saveAsPreset,
    applyPreset,
    deletePreset,
    resetToDefault,
  };
}
