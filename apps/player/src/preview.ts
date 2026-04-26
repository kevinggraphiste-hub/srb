import type { GameMap, Project } from '@srb/types';

/**
 * Preview mode lets the editor load a project into the player without
 * going through the static `/maps/*.json` files. When the player is
 * booted with `?preview=1`, main.ts waits for a postMessage from its
 * parent window (the editor iframe host) carrying the project payload,
 * then delegates map resolution to this module.
 */

let previewProject: Project | null = null;
let previewStartMapId: string | null = null;

export function isPreviewMode(): boolean {
  return new URLSearchParams(window.location.search).get('preview') === '1';
}

export function setPreviewProject(project: Project, startMapId: string): void {
  previewProject = project;
  previewStartMapId = startMapId;
}

export function getPreviewStartMapId(): string | null {
  return previewStartMapId;
}

/** Returns the full preview project, or null if not in preview mode. */
export function getPreviewProject(): Project | null {
  return previewProject;
}

/** Returns the map with this id from the preview project, or null if none. */
export function getPreviewMap(mapId: string): GameMap | null {
  if (!previewProject) return null;
  for (const item of previewProject.items) {
    if (item.type === 'map' && item.map.id === mapId) return item.map;
  }
  return null;
}

/** Waits for the parent window to post the preview project. Resolves on receipt or timeout. */
export function waitForPreviewProject(timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (ok: boolean): void => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('message', handler);
      resolve(ok);
    };
    const handler = (event: MessageEvent): void => {
      const data = event.data as
        | { type?: string; project?: Project; startMapId?: string }
        | null
        | undefined;
      if (!data || data.type !== 'srb:preview-project') return;
      if (!data.project || !data.startMapId) return;
      setPreviewProject(data.project, data.startMapId);
      finish(true);
    };
    window.addEventListener('message', handler);
    // Announce readiness to the host. The host should reply with the project.
    try {
      window.parent.postMessage({ type: 'srb:preview-ready' }, '*');
    } catch {
      // Not in an iframe, or blocked by the browser. Falls through to timeout.
    }
    setTimeout(() => finish(false), timeoutMs);
  });
}
