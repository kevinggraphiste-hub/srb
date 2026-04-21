import { useCallback, useEffect, useState } from 'react';
import type { GameMap, Project } from '@srb/types';
import { Palette } from './components/Palette';
import { LayerSelect, type EditableLayer } from './components/LayerSelect';
import { ToolSelect, type Tool } from './components/ToolSelect';
import { MapCanvas } from './components/MapCanvas';
import { ProjectTree } from './components/ProjectTree';
import { NewMapDialog } from './components/NewMapDialog';
import { ResizeMapDialog } from './components/ResizeMapDialog';
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

const APP_VERSION = '0.2.2';

export function App() {
  const [project, setProject] = useState<Project>(() => createBlankProject());
  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [activeLayer, setActiveLayer] = useState<EditableLayer>('ground');
  const [activeTool, setActiveTool] = useState<Tool>('stamp');

  const [newMapParentId, setNewMapParentId] = useState<string | undefined>(undefined);
  const [newMapDialogOpen, setNewMapDialogOpen] = useState(false);

  const [settingsMapId, setSettingsMapId] = useState<string | null>(null);

  const activeMap: GameMap | null = getActiveMap(project);

  const handleMapChange = useCallback((next: GameMap) => {
    setProject((p) => replaceActiveMap(p, next));
  }, []);

  const handleSelectMap = useCallback((mapId: string) => {
    setProject((p) => setActiveMapId(p, mapId));
  }, []);

  const openNewMapDialog = useCallback((parentId?: string) => {
    setNewMapParentId(parentId);
    setNewMapDialogOpen(true);
  }, []);

  const handleNewMap = useCallback(
    ({ name, width, height }: { name: string; width: number; height: number }) => {
      const map = createBlankMap(width, height, { name });
      setProject((p) => addMapToProject(p, map, newMapParentId));
    },
    [newMapParentId],
  );

  const handleNewFolder = useCallback((parentId?: string) => {
    const name = window.prompt('Nom du dossier ?', 'Nouveau dossier');
    if (!name) return;
    setProject((p) => addFolderToProject(p, name, parentId));
  }, []);

  const handleRename = useCallback((id: string, newName: string) => {
    setProject((p) => renameItem(p, id, newName));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setProject((p) => deleteItem(p, id));
  }, []);

  const handleMove = useCallback((sourceId: string, newParentId?: string) => {
    setProject((p) => moveItem(p, sourceId, newParentId));
  }, []);

  const settingsMap = settingsMapId
    ? project.items.find((i) => i.type === 'map' && i.map.id === settingsMapId)
    : undefined;
  const settingsMapData = settingsMap?.type === 'map' ? settingsMap.map : null;

  const handleApplyMapSettings = useCallback(
    ({ name, width, height }: { name: string; width: number; height: number }) => {
      if (!settingsMapId) return;
      setProject((p) => {
        const renamed = renameItem(p, settingsMapId, name);
        return resizeMap(renamed, settingsMapId, width, height);
      });
    },
    [settingsMapId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() === 'b' && !ctrl) {
        setActiveTool('stamp');
        return;
      }
      if (e.key.toLowerCase() === 'e' && !ctrl) {
        setActiveTool('eraser');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="editor-root">
      <header className="editor-header">
        <h1>SRB Editor</h1>
        <span className="subtitle">
          v{APP_VERSION} · {project.name}
          {activeMap ? ` · ${activeMap.name} (${activeMap.width}×${activeMap.height})` : ''}
        </span>
        <div className="header-actions">
          <button type="button" onClick={() => openNewMapDialog(undefined)}>
            + Nouvelle map
          </button>
        </div>
      </header>

      <aside className="editor-panel palette">
        <h2>Outils</h2>
        <ToolSelect active={activeTool} onChange={setActiveTool} />
        <h2>Tiles</h2>
        <Palette selectedTileId={selectedTileId} onSelect={setSelectedTileId} />
        <LayerSelect active={activeLayer} onChange={setActiveLayer} />
      </aside>

      <main className="map-canvas-wrapper">
        {activeMap ? (
          <MapCanvas
            key={activeMap.id}
            map={activeMap}
            activeLayer={activeLayer}
            selectedTileId={selectedTileId}
            activeTool={activeTool}
            onMapChange={handleMapChange}
          />
        ) : (
          <div className="empty-state">
            Aucune map sélectionnée. Crée-en une depuis l&apos;arbre.
          </div>
        )}
      </main>

      <aside className="editor-panel inspector">
        <h2>Projet</h2>
        <ProjectTree
          project={project}
          onSelectMap={handleSelectMap}
          onNewMap={openNewMapDialog}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={handleMove}
          onOpenMapSettings={setSettingsMapId}
        />
        <h2 style={{ marginTop: 16 }}>Aide</h2>
        <p>
          <strong>B</strong> stamp · <strong>E</strong> eraser · <strong>double-clic</strong>{' '}
          renommer · <strong>glisser</strong> déplacer
        </p>
        <p style={{ color: '#555', marginTop: 8 }}>Pas encore de sauvegarde — ferme = perdu.</p>
      </aside>

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
  );
}
