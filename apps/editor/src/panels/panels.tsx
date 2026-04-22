import { useEditor } from '../context/EditorContext';
import { Palette } from '../components/Palette';
import { LayerSelect } from '../components/LayerSelect';
import { ToolSelect } from '../components/ToolSelect';
import { ProjectTree } from '../components/ProjectTree';
import { MapCanvas } from '../components/MapCanvas';
import { EventEditor } from '../components/EventEditor';
import { findEventById } from '../data/events';

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
        showCollision={e.showCollision}
        onToggleShowCollision={e.toggleShowCollision}
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
        <strong>B</strong> stamp · <strong>E</strong> eraser · <strong>R</strong> rect ·{' '}
        <strong>F</strong> fill · <strong>V</strong> event · <strong>Ctrl+Z</strong> undo ·{' '}
        <strong>Ctrl+P</strong> preview
      </p>
      <p>
        <strong>Shift+drag</strong> avec stamp ou eraser = rect (sans changer d&apos;outil).
      </p>
      <p>
        <strong>Outil Event</strong> : clic sur une tile vide = crée un event, clic sur un event =
        le sélectionne dans le panneau Event.
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
      showCollision={e.showCollision}
      selectedEventId={e.selectedEventId}
      onMapChange={e.onMapChange}
      onStrokeBegin={e.onStrokeBegin}
      onStrokeEnd={e.onStrokeEnd}
      onEventToolClick={e.onEventToolClick}
    />
  );
}

export function EventPanel() {
  const e = useEditor();
  const selected =
    e.selectedEventId && e.activeMap ? findEventById(e.activeMap, e.selectedEventId) : null;
  if (!selected) {
    return (
      <div className="panel-body event-panel-empty">
        <p className="muted">
          Aucun event sélectionné. Active l&apos;outil <strong>Event (V)</strong> et clique sur une
          tile pour en créer ou en sélectionner un.
        </p>
      </div>
    );
  }
  return (
    <div className="panel-body">
      <EventEditor
        event={selected}
        onChange={e.onEventChange}
        onDelete={e.onEventDelete}
        onClose={() => e.setSelectedEventId(null)}
      />
    </div>
  );
}

export const PANEL_COMPONENTS = {
  tools: ToolsPanel,
  tiles: TilesPanel,
  layer: LayerPanel,
  project: ProjectPanel,
  help: HelpPanel,
  canvas: CanvasPanel,
  event: EventPanel,
} as const;

export const PANEL_TITLES: Record<keyof typeof PANEL_COMPONENTS, string> = {
  tools: 'Outils',
  tiles: 'Tiles',
  layer: 'Couche',
  project: 'Projet',
  help: 'Aide',
  canvas: 'Map',
  event: 'Event',
};
