import { useCallback, useEffect, useState } from 'react';
import type { SerializedDockview } from 'dockview-react';
import type { GameMap, Project } from '@srb/types';
import { DockLayout } from './components/DockLayout';
import { NewMapDialog } from './components/NewMapDialog';
import { ResizeMapDialog } from './components/ResizeMapDialog';
import { WorkspaceMenu } from './components/WorkspaceMenu';
import { EditorProvider, type EditorContextValue } from './context/EditorContext';
import { useWorkspace } from './hooks/useWorkspace';
import { useProjectHistory } from './hooks/useProjectHistory';
import type { EditableLayer, RenderableLayer } from './components/LayerSelect';
import type { Tool } from './components/ToolSelect';
import { createBlankMap } from './data/blank-map';
import {
  addFolderToProject,
  addMapToProject,
  createBlankProject,
  deleteItem,
  getActiveMap,
  moveItem,
  renameItem,
  replaceActiveMap,
  resizeMap,
  setActiveMapId,
} from './data/project';

const APP_VERSION = '0.3.0';

export function App() {
  const history = useProjectHistory(createBlankProject);
  const project = history.project;
  const setProject = history.setProject;

  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [activeLayer, setActiveLayer] = useState<EditableLayer>('ground');
  const [activeTool, setActiveTool] = useState<Tool>('stamp');
  const [hiddenLayers, setHiddenLayers] = useState<Set<RenderableLayer>>(() => new Set());
  const [showCollision, setShowCollision] = useState<boolean>(false);

  const toggleLayerVisibility = useCallback((layer: RenderableLayer) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const toggleShowCollision = useCallback(() => setShowCollision((v) => !v), []);

  const [newMapParentId, setNewMapParentId] = useState<string | undefined>(undefined);
  const [newMapDialogOpen, setNewMapDialogOpen] = useState(false);
  const [settingsMapId, setSettingsMapId] = useState<string | null>(null);

  const workspace = useWorkspace();
  const [layoutToApply, setLayoutToApply] = useState<SerializedDockview | 'default' | null>(null);

  const activeMap: GameMap | null = getActiveMap(project);

  const handleMapChange = useCallback(
    (next: GameMap) => {
      setProject((p: Project) => replaceActiveMap(p, next));
    },
    [setProject],
  );

  const handleSelectMap = useCallback(
    (mapId: string) => {
      setProject((p: Project) => setActiveMapId(p, mapId));
    },
    [setProject],
  );

  const openNewMapDialog = useCallback((parentId?: string) => {
    setNewMapParentId(parentId);
    setNewMapDialogOpen(true);
  }, []);

  const handleNewMap = useCallback(
    ({ name, width, height }: { name: string; width: number; height: number }) => {
      const map = createBlankMap(width, height, { name });
      setProject((p: Project) => addMapToProject(p, map, newMapParentId));
    },
    [newMapParentId, setProject],
  );

  const handleNewFolder = useCallback(
    (parentId?: string) => {
      const name = window.prompt('Nom du dossier ?', 'Nouveau dossier');
      if (!name) return;
      setProject((p: Project) => addFolderToProject(p, name, parentId));
    },
    [setProject],
  );

  const handleRename = useCallback(
    (id: string, newName: string) => {
      setProject((p: Project) => renameItem(p, id, newName));
    },
    [setProject],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setProject((p: Project) => deleteItem(p, id));
    },
    [setProject],
  );

  const handleMove = useCallback(
    (sourceId: string, newParentId?: string) => {
      setProject((p: Project) => moveItem(p, sourceId, newParentId));
    },
    [setProject],
  );

  const settingsMap = settingsMapId
    ? project.items.find((i) => i.type === 'map' && i.map.id === settingsMapId)
    : undefined;
  const settingsMapData = settingsMap?.type === 'map' ? settingsMap.map : null;

  const handleApplyMapSettings = useCallback(
    ({ name, width, height }: { name: string; width: number; height: number }) => {
      if (!settingsMapId) return;
      setProject((p: Project) => {
        const renamed = renameItem(p, settingsMapId, name);
        return resizeMap(renamed, settingsMapId, width, height);
      });
    },
    [settingsMapId, setProject],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        history.redo();
        return;
      }

      if (e.key.toLowerCase() === 'b' && !ctrl) {
        setActiveTool('stamp');
        return;
      }
      if (e.key.toLowerCase() === 'e' && !ctrl) {
        setActiveTool('eraser');
        return;
      }
      if (e.key.toLowerCase() === 'r' && !ctrl) {
        setActiveTool('rect');
        return;
      }
      if (e.key.toLowerCase() === 'f' && !ctrl) {
        setActiveTool('fill');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  const editorContext: EditorContextValue = {
    project,
    activeMap,
    selectedTileId,
    setSelectedTileId,
    activeLayer,
    setActiveLayer,
    hiddenLayers,
    toggleLayerVisibility,
    showCollision,
    toggleShowCollision,
    activeTool,
    setActiveTool,
    onMapChange: handleMapChange,
    onSelectMap: handleSelectMap,
    onNewMap: openNewMapDialog,
    onNewFolder: handleNewFolder,
    onRename: handleRename,
    onDelete: handleDelete,
    onMove: handleMove,
    onOpenMapSettings: setSettingsMapId,
    onStrokeBegin: history.beginStroke,
    onStrokeEnd: history.commitStroke,
  };

  return (
    <EditorProvider value={editorContext}>
      <div className="editor-root">
        <header className="editor-header">
          <h1>SRB Editor</h1>
          <span className="subtitle">
            v{APP_VERSION} · {project.name}
            {activeMap ? ` · ${activeMap.name} (${activeMap.width}×${activeMap.height})` : ''}
          </span>
          <div className="header-actions">
            <button
              type="button"
              onClick={history.undo}
              disabled={!history.canUndo}
              title="Annuler (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              title="Refaire (Ctrl+Shift+Z)"
            >
              ↷ Redo
            </button>
            <WorkspaceMenu
              presets={workspace.presets}
              hasCustomDefault={workspace.defaultLayout !== null}
              onSaveAs={workspace.saveAsPreset}
              onApply={(id) => {
                const layout = workspace.applyPreset(id);
                if (layout) setLayoutToApply(layout);
              }}
              onDelete={workspace.deletePreset}
              onSetCurrentAsDefault={workspace.setCurrentAsDefault}
              onClearDefault={workspace.clearDefault}
              onReset={() => {
                workspace.resetToDefault();
                setLayoutToApply('default');
              }}
            />
            <button type="button" onClick={() => openNewMapDialog(undefined)}>
              + Nouvelle map
            </button>
          </div>
        </header>

        <main className="editor-main">
          <DockLayout
            initialLayout={workspace.currentLayout}
            defaultLayout={workspace.defaultLayout}
            onLayoutChange={workspace.onLayoutChange}
            layoutToApply={layoutToApply}
            onLayoutApplied={() => setLayoutToApply(null)}
          />
        </main>

        <NewMapDialog
          open={newMapDialogOpen}
          onClose={() => setNewMapDialogOpen(false)}
          onCreate={handleNewMap}
        />

        <ResizeMapDialog
          open={settingsMapId !== null && settingsMapData !== null}
          currentName={settingsMapData?.name ?? ''}
          currentWidth={settingsMapData?.width ?? 20}
          currentHeight={settingsMapData?.height ?? 15}
          onClose={() => setSettingsMapId(null)}
          onApply={handleApplyMapSettings}
        />
      </div>
    </EditorProvider>
  );
}
