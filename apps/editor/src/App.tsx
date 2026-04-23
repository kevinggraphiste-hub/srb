import { useCallback, useEffect, useRef, useState } from 'react';
import type { DockviewApi, SerializedDockview } from 'dockview-react';
import type { GameMap, MapEvent, Project } from '@srb/types';
import { DockLayout } from './components/DockLayout';
import { NewMapDialog } from './components/NewMapDialog';
import { ResizeMapDialog } from './components/ResizeMapDialog';
import { WorkspaceMenu } from './components/WorkspaceMenu';
import { EditorProvider, type EditorContextValue } from './context/EditorContext';
import { useWorkspace } from './hooks/useWorkspace';
import { useProjectHistory } from './hooks/useProjectHistory';
import {
  clearAutosavedProject,
  exportProjectAsJson,
  importProjectFromFile,
  loadAutosavedProject,
  useAutosave,
} from './hooks/useProjectPersistence';
import { ProjectMenu } from './components/ProjectMenu';
import { PreviewModal } from './components/PreviewModal';
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
import {
  addEventToMap,
  deleteEventFromMap,
  findEventAt,
  replaceEventInMap,
} from './data/events';
import { createEventFromTemplate, type EventTemplateId } from './data/event-templates';
import { EventTemplatePicker } from './components/EventTemplatePicker';

const APP_VERSION = '0.5.4';
const PLAYER_URL =
  (import.meta.env.VITE_PLAYER_URL as string | undefined) ?? 'http://localhost:5173/?preview=1';

export function App() {
  const history = useProjectHistory(() => loadAutosavedProject() ?? createBlankProject());
  const project = history.project;
  const setProject = history.setProject;
  useAutosave(project);

  // Default to dirt (id 1) so the first stamp/rect/fill is visible on a
  // freshly-created grass-only map (fill with id 0 on a grass map is a no-op).
  const [selectedTileId, setSelectedTileId] = useState<number>(1);
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [templatePickerCoords, setTemplatePickerCoords] = useState<{ x: number; y: number } | null>(
    null,
  );

  const workspace = useWorkspace();
  const [layoutToApply, setLayoutToApply] = useState<SerializedDockview | 'default' | null>(null);
  const dockApiRef = useRef<DockviewApi | null>(null);

  const focusPanel = useCallback((panelId: string) => {
    dockApiRef.current?.getPanel(panelId)?.api.setActive();
  }, []);

  const activeMap: GameMap | null = getActiveMap(project);

  const handleMapChange = useCallback(
    (next: GameMap) => {
      setProject((p: Project) => replaceActiveMap(p, next));
    },
    [setProject],
  );

  const handleSelectMap = useCallback(
    (mapId: string) => {
      setSelectedEventId(null);
      setProject((p: Project) => setActiveMapId(p, mapId));
    },
    [setProject],
  );

  const handleEventToolClick = useCallback(
    (tileX: number, tileY: number) => {
      if (!activeMap) return;
      const existing = findEventAt(activeMap, tileX, tileY);
      if (existing) {
        setSelectedEventId(existing.id);
        focusPanel('event');
        return;
      }
      // Empty tile: offer a template picker rather than spawning a blank,
      // half-configured event. "Vide" template is still available for users
      // who know exactly what they want.
      setTemplatePickerCoords({ x: tileX, y: tileY });
    },
    [activeMap, focusPanel],
  );

  const handlePickTemplate = useCallback(
    (templateId: EventTemplateId) => {
      if (!activeMap || !templatePickerCoords) return;
      const { x, y } = templatePickerCoords;
      const fresh = createEventFromTemplate(templateId, x, y);
      setProject((p: Project) => replaceActiveMap(p, addEventToMap(activeMap, fresh)));
      setSelectedEventId(fresh.id);
      setTemplatePickerCoords(null);
      focusPanel('event');
    },
    [activeMap, setProject, templatePickerCoords, focusPanel],
  );

  const handleEventChange = useCallback(
    (next: MapEvent) => {
      if (!activeMap) return;
      setProject((p: Project) =>
        replaceActiveMap(p, replaceEventInMap(activeMap, next.id, next)),
      );
    },
    [activeMap, setProject],
  );

  const handleEventDelete = useCallback(
    (eventId: string) => {
      if (!activeMap) return;
      setProject((p: Project) => replaceActiveMap(p, deleteEventFromMap(activeMap, eventId)));
      setSelectedEventId((cur) => (cur === eventId ? null : cur));
    },
    [activeMap, setProject],
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

  const handleRenameProject = useCallback(
    (next: string) => {
      setProject((p: Project) => ({ ...p, name: next }));
    },
    [setProject],
  );

  const handleExportProject = useCallback(() => {
    exportProjectAsJson(project);
  }, [project]);

  const handleImportProject = useCallback(
    async (file: File) => {
      try {
        const imported = await importProjectFromFile(file);
        history.replaceAll(imported);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import échoué.';
        window.alert(message);
      }
    },
    [history],
  );

  const handleNewProject = useCallback(() => {
    clearAutosavedProject();
    history.replaceAll(createBlankProject());
  }, [history]);

  // Stable ref to history so the keyboard listener doesn't re-register on
  // every render (history is a fresh object each render).
  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) historyRef.current.redo();
        else historyRef.current.undo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        e.stopPropagation();
        historyRef.current.redo();
        return;
      }

      if (ctrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPreviewOpen((v) => !v);
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
      if (e.key.toLowerCase() === 'v' && !ctrl) {
        setActiveTool('event');
        return;
      }
    };
    // Register on BOTH window and document in capture phase. Some embedded
    // libs (Phaser/Dockview) may attach to one target but not the other;
    // capture phase ensures we run before any bubble-phase handler.
    const opts: AddEventListenerOptions = { capture: true };
    window.addEventListener('keydown', onKey, opts);
    document.addEventListener('keydown', onKey, opts);
    return () => {
      window.removeEventListener('keydown', onKey, opts);
      document.removeEventListener('keydown', onKey, opts);
    };
  }, []);

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
    selectedEventId,
    setSelectedEventId,
    onEventChange: handleEventChange,
    onEventDelete: handleEventDelete,
    onEventToolClick: handleEventToolClick,
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
              ↶ Undo ({history.pastSize})
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              title="Refaire (Ctrl+Shift+Z)"
            >
              ↷ Redo ({history.futureSize})
            </button>
            <ProjectMenu
              projectName={project.name}
              onRename={handleRenameProject}
              onExport={handleExportProject}
              onImport={handleImportProject}
              onNewProject={handleNewProject}
            />
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
            <button
              type="button"
              className="preview-button"
              disabled={!activeMap}
              onClick={() => setPreviewOpen(true)}
              title="Tester la map active (Ctrl+P)"
            >
              ▶ Tester
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
            onApiReady={(api) => {
              dockApiRef.current = api;
            }}
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

        {previewOpen && activeMap && (
          <PreviewModal
            project={project}
            startMapId={activeMap.id}
            playerUrl={PLAYER_URL}
            onClose={() => setPreviewOpen(false)}
          />
        )}

        <EventTemplatePicker
          open={templatePickerCoords !== null}
          tileX={templatePickerCoords?.x ?? 0}
          tileY={templatePickerCoords?.y ?? 0}
          onClose={() => setTemplatePickerCoords(null)}
          onPick={handlePickTemplate}
        />
      </div>
    </EditorProvider>
  );
}
