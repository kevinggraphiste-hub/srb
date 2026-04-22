import { useRef, useState } from 'react';

interface ProjectMenuProps {
  projectName: string;
  onRename: (nextName: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNewProject: () => void;
}

/** Header dropdown for project-level actions (save/load/new). */
export function ProjectMenu({
  projectName,
  onRename,
  onExport,
  onImport,
  onNewProject,
}: ProjectMenuProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = (): void => {
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so the same file can be picked twice
    if (file) onImport(file);
  };

  const handleRename = (): void => {
    const next = window.prompt('Nom du projet ?', projectName);
    if (!next) return;
    const trimmed = next.trim();
    if (trimmed && trimmed !== projectName) onRename(trimmed);
    setOpen(false);
  };

  const handleNew = (): void => {
    const ok = window.confirm(
      'Créer un nouveau projet ? Ton projet actuel sera perdu (pense à exporter avant).',
    );
    if (ok) onNewProject();
    setOpen(false);
  };

  return (
    <div className="workspace-menu">
      <button type="button" onClick={() => setOpen((v) => !v)} className="workspace-toggle">
        Projet ▾
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {open && (
        <>
          <div className="workspace-backdrop" onClick={() => setOpen(false)} />
          <div className="workspace-popup">
            <button type="button" className="workspace-item" onClick={handleRename}>
              Renommer le projet
            </button>
            <div className="workspace-divider" />
            <button
              type="button"
              className="workspace-item primary"
              onClick={() => {
                onExport();
                setOpen(false);
              }}
            >
              ⬇ Exporter en JSON
            </button>
            <button type="button" className="workspace-item" onClick={handleImportClick}>
              ⬆ Importer un JSON
            </button>
            <div className="workspace-divider" />
            <button type="button" className="workspace-item" onClick={handleNew}>
              + Nouveau projet
            </button>
          </div>
        </>
      )}
    </div>
  );
}
