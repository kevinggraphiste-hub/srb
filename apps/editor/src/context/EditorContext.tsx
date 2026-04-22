import { createContext, useContext, type ReactNode } from 'react';
import type { GameMap, MapEvent, Project } from '@srb/types';
import type { EditableLayer, RenderableLayer } from '../components/LayerSelect';
import type { Tool } from '../components/ToolSelect';

/**
 * Central shared state + callbacks exposed to every panel.
 * Panels are rendered by dockview in their own React tree, so we avoid
 * prop-drilling by reading from this context.
 */
export interface EditorContextValue {
  project: Project;
  activeMap: GameMap | null;

  selectedTileId: number;
  setSelectedTileId: (id: number) => void;

  activeLayer: EditableLayer;
  setActiveLayer: (layer: EditableLayer) => void;

  hiddenLayers: Set<RenderableLayer>;
  toggleLayerVisibility: (layer: RenderableLayer) => void;

  showCollision: boolean;
  toggleShowCollision: () => void;

  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;

  onStrokeBegin: () => void;
  onStrokeEnd: () => void;

  onMapChange: (map: GameMap) => void;
  onSelectMap: (mapId: string) => void;
  onNewMap: (parentId?: string) => void;
  onNewFolder: (parentId?: string) => void;
  onRename: (itemId: string, newName: string) => void;
  onDelete: (itemId: string) => void;
  onMove: (sourceId: string, newParentId?: string) => void;
  onOpenMapSettings: (mapId: string) => void;

  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  onEventChange: (event: MapEvent) => void;
  onEventDelete: (eventId: string) => void;
  onEventToolClick: (tileX: number, tileY: number) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  value: EditorContextValue;
  children: ReactNode;
}

export function EditorProvider({ value, children }: EditorProviderProps) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>');
  return ctx;
}
