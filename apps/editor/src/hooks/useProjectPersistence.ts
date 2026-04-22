import { useEffect, useRef } from 'react';
import type { Project } from '@srb/types';

const STORAGE_KEY = 'srb-editor:project-autosave';
const AUTOSAVE_DEBOUNCE_MS = 1500;

/** Loads the autosaved project, or null if none. Safe against corrupt JSON. */
export function loadAutosavedProject(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    if (!parsed.id || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Clears the autosave slot. Called when the user explicitly starts fresh. */
export function clearAutosavedProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Persists the project to localStorage after any change, debounced so
 * that a stroke of 50 paints only triggers one write.
 */
export function useAutosave(project: Project): void {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        // quota exceeded, private mode, etc. Fail silently.
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [project]);
}

/** Triggers a browser download of the project as a .srb.json file. */
export function exportProjectAsJson(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(project.name)}.srb.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Reads a Project from a user-picked File. Throws on parse failure. */
export async function importProjectFromFile(file: File): Promise<Project> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Project;
  if (!parsed.id || !Array.isArray(parsed.items)) {
    throw new Error('Fichier invalide : pas un projet SRB.');
  }
  return parsed;
}

function sanitize(name: string): string {
  return name.replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 50) || 'projet';
}
