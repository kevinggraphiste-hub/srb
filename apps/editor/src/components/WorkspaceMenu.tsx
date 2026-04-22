import { useState } from 'react';
import type { WorkspacePreset } from '../hooks/useWorkspace';

interface WorkspaceMenuProps {
  presets: WorkspacePreset[];
  hasCustomDefault: boolean;
  onSaveAs: (name: string) => void;
  onApply: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onSetCurrentAsDefault: () => void;
  onClearDefault: () => void;
  onReset: () => void;
}

/**
 * Small dropdown for workspace presets. Lets the user save the current
 * layout as a named preset, jump between presets, reset to the default.
 */
export function WorkspaceMenu({
  presets,
  hasCustomDefault,
  onSaveAs,
  onApply,
  onDelete,
  onSetCurrentAsDefault,
  onClearDefault,
  onReset,
}: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSaveAs = (): void => {
    const name = window.prompt('Nom du workspace ?', `Workspace ${presets.length + 1}`);
    if (!name) return;
    onSaveAs(name.trim());
    setOpen(false);
  };

  const handleApply = (id: string): void => {
    onApply(id);
    setOpen(false);
  };

  const handleDelete = (preset: WorkspacePreset, e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer le workspace "${preset.name}" ?`)) return;
    onDelete(preset.id);
  };

  return (
    <div className="workspace-menu">
      <button type="button" onClick={() => setOpen((v) => !v)} className="workspace-toggle">
        Workspace ▾
      </button>
      {open && (
        <>
          <div className="workspace-backdrop" onClick={() => setOpen(false)} />
          <div className="workspace-popup">
            <button
              type="button"
              className="workspace-item"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
            >
              Reset au layout par défaut
            </button>
            <button
              type="button"
              className="workspace-item primary"
              onClick={() => {
                onSetCurrentAsDefault();
                setOpen(false);
              }}
            >
              ★ Définir comme défaut
            </button>
            {hasCustomDefault && (
              <button
                type="button"
                className="workspace-item"
                onClick={() => {
                  if (!window.confirm('Revenir au layout défaut d\'origine ?')) return;
                  onClearDefault();
                  setOpen(false);
                }}
              >
                Restaurer le défaut d&apos;origine
              </button>
            )}
            <button type="button" className="workspace-item" onClick={handleSaveAs}>
              + Sauver comme preset…
            </button>
            <div className="workspace-divider" />
            {presets.length === 0 ? (
              <div className="workspace-empty">Aucun workspace sauvegardé</div>
            ) : (
              presets.map((p) => (
                <div key={p.id} className="workspace-row">
                  <button
                    type="button"
                    className="workspace-item"
                    onClick={() => handleApply(p.id)}
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    className="workspace-delete"
                    onClick={(e) => handleDelete(p, e)}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
