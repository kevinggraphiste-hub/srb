import { useEditor } from '../context/EditorContext';
import { Palette } from '../components/Palette';
import { LayerSelect } from '../components/LayerSelect';
import { ToolSelect } from '../components/ToolSelect';
import { ProjectTree } from '../components/ProjectTree';
import { MapCanvas } from '../components/MapCanvas';

/**
 * Each exported component here is registered with DockviewReact via its
 * `components` record. Dockview instantiates them, and they pull state
 * from EditorContext (no props drilling).
 */

export function ToolsPanel() {
  const e = useEditor();
  return (
    <div className="panel-body">
      <ToolSelect active={e.activeTool} onChange={e.setActiveTool} />
    </div>
  );
}

export function TilesPanel() {
  const e = useEditor();
  return (
    <div className="panel-body">
      <Palette selectedTileId={e.selectedTileId} onSelect={e.setSelectedTileId} />
    </div>
  );
}

export function LayerPanel() {
  const e = useEditor();
  return (
    <div className="panel-body">
      <LayerSelect
        active={e.activeLayer}
        onChange={e.setActiveLayer}
        hiddenLayers={e.hiddenLayers}
        onToggleVisibility={e.toggleLayerVisibility}
      />
    </div>
  );
}

export function ProjectPanel() {
  const e = useEditor();
  return (
    <div className="panel-body">
      <ProjectTree
        project={e.project}
        onSelectMap={e.onSelectMap}
        onNewMap={e.onNewMap}
        onNewFolder={e.onNewFolder}
        onRename={e.onRename}
        onDelete={e.onDelete}
        onMove={e.onMove}
        onOpenMapSettings={e.onOpenMapSettings}
      />
    </div>
  );
}

export function HelpPanel() {
  return (
    <div className="panel-body help-panel">
      <p>
        <strong>B</strong> stamp · <strong>E</strong> eraser
      </p>
      <p>
        <strong>Double-clic</strong> sur un item du projet pour le renommer ·{' '}
        <strong>glisser</strong> un item sur un autre pour le déplacer · <strong>⇡</strong> pour le
        détacher à la racine.
      </p>
      <p>
        Tu peux aussi <strong>glisser les onglets</strong> de chaque panel pour les réorganiser, les
        stacker, ou les mettre en haut/bas.
      </p>
      <p style={{ color: '#555', marginTop: 8 }}>
        Pas encore de sauvegarde du projet — ferme l&apos;onglet = tout perdu.
      </p>
    </div>
  );
}

export function CanvasPanel() {
  const e = useEditor();
  if (!e.activeMap) {
    return <div className="empty-state">Aucune map sélectionnée.</div>;
  }
  return (
    <MapCanvas
      key={e.activeMap.id}
      map={e.activeMap}
      activeLayer={e.activeLayer}
      hiddenLayers={e.hiddenLayers}
      selectedTileId={e.selectedTileId}
      activeTool={e.activeTool}
      onMapChange={e.onMapChange}
    />
  );
}

export const PANEL_COMPONENTS = {
  tools: ToolsPanel,
  tiles: TilesPanel,
  layer: LayerPanel,
  project: ProjectPanel,
  help: HelpPanel,
  canvas: CanvasPanel,
} as const;

export const PANEL_TITLES: Record<keyof typeof PANEL_COMPONENTS, string> = {
  tools: 'Outils',
  tiles: 'Tiles',
  layer: 'Couche',
  project: 'Projet',
  help: 'Aide',
  canvas: 'Map',
};
