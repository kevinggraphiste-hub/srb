import { useEffect, useRef } from 'react';
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type SerializedDockview,
} from 'dockview-react';

type Disposable = { dispose(): void };
import 'dockview-react/dist/styles/dockview.css';
import { PANEL_COMPONENTS, PANEL_TITLES } from '../panels/panels';

interface DockLayoutProps {
  /** Serialized layout to restore on mount. Null = build default layout. */
  initialLayout: SerializedDockview | null;
  /** User-chosen default, used when current is null or on reset. Null = fall back to hardcoded. */
  defaultLayout: SerializedDockview | null;
  /** Called with the new serialized layout whenever dockview reshapes. */
  onLayoutChange: (layout: SerializedDockview) => void;
  /** External signal to force-reload a layout (e.g. applying a preset). */
  layoutToApply: SerializedDockview | null | 'default';
  /** Called after a layoutToApply has been consumed, so the parent can clear it. */
  onLayoutApplied: () => void;
}

/**
 * Apply the user's saved default layout if present, else build the hardcoded fallback.
 * `api.clear()` is the caller's responsibility.
 */
function applyDefaultLayout(api: DockviewApi, userDefault: SerializedDockview | null): void {
  if (userDefault) {
    try {
      api.fromJSON(userDefault);
      return;
    } catch {
      // fall through to hardcoded
    }
  }
  buildHardcodedLayout(api);
}

function buildHardcodedLayout(api: DockviewApi): void {
  // Left column: Tools + Tiles + Layer (stacked as tabs).
  api.addPanel({ id: 'tools', component: 'tools', title: PANEL_TITLES.tools });
  api.addPanel({
    id: 'tiles',
    component: 'tiles',
    title: PANEL_TITLES.tiles,
    position: { referencePanel: 'tools', direction: 'below' },
  });
  api.addPanel({
    id: 'layer',
    component: 'layer',
    title: PANEL_TITLES.layer,
    position: { referencePanel: 'tiles', direction: 'below' },
  });

  // Center: the canvas.
  api.addPanel({
    id: 'canvas',
    component: 'canvas',
    title: PANEL_TITLES.canvas,
    position: { referencePanel: 'tools', direction: 'right' },
  });

  // Right column: Project tree + Help.
  api.addPanel({
    id: 'project',
    component: 'project',
    title: PANEL_TITLES.project,
    position: { referencePanel: 'canvas', direction: 'right' },
  });
  api.addPanel({
    id: 'help',
    component: 'help',
    title: PANEL_TITLES.help,
    position: { referencePanel: 'project', direction: 'below' },
  });
}

export function DockLayout({
  initialLayout,
  defaultLayout,
  onLayoutChange,
  layoutToApply,
  onLayoutApplied,
}: DockLayoutProps) {
  const apiRef = useRef<DockviewApi | null>(null);
  const layoutListenerRef = useRef<Disposable | null>(null);

  const handleReady = (event: DockviewReadyEvent): void => {
    const api = event.api;
    apiRef.current = api;

    if (initialLayout) {
      try {
        api.fromJSON(initialLayout);
      } catch {
        api.clear();
        applyDefaultLayout(api, defaultLayout);
      }
    } else {
      applyDefaultLayout(api, defaultLayout);
    }

    // Subscribe to layout changes for persistence. Stored so the effect below can dispose it.
    layoutListenerRef.current = api.onDidLayoutChange(() => {
      onLayoutChange(api.toJSON());
    });
  };

  useEffect(() => {
    return (): void => {
      layoutListenerRef.current?.dispose();
      layoutListenerRef.current = null;
    };
  }, []);

  // Apply imperative layout changes (preset load, reset) after mount.
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !layoutToApply) return;
    api.clear();
    if (layoutToApply === 'default') {
      applyDefaultLayout(api, defaultLayout);
    } else {
      try {
        api.fromJSON(layoutToApply);
      } catch {
        applyDefaultLayout(api, defaultLayout);
      }
    }
    onLayoutApplied();
  }, [layoutToApply, defaultLayout, onLayoutApplied]);

  return (
    <DockviewReact
      className="dockview-theme-abyss editor-dock"
      components={PANEL_COMPONENTS}
      onReady={handleReady}
    />
  );
}
