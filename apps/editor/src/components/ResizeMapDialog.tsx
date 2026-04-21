import { useEffect, useState } from 'react';

interface ResizeMapDialogProps {
  open: boolean;
  currentName: string;
  currentWidth: number;
  currentHeight: number;
  onClose: () => void;
  onApply: (params: { name: string; width: number; height: number }) => void;
}

/** Dialog to edit an existing map's name and dimensions. */
export function ResizeMapDialog({
  open,
  currentName,
  currentWidth,
  currentHeight,
  onClose,
  onApply,
}: ResizeMapDialogProps) {
  const [name, setName] = useState(currentName);
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);

  // Sync inputs with selected map when the dialog (re)opens
  useEffect(() => {
    if (!open) return;
    setName(currentName);
    setWidth(currentWidth);
    setHeight(currentHeight);
  }, [open, currentName, currentWidth, currentHeight]);

  if (!open) return null;

  const shrinking = width < currentWidth || height < currentHeight;

  const submit = (): void => {
    if (width < 1 || height < 1 || width > 200 || height > 200) return;
    onApply({ name: name.trim() || currentName, width, height });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Paramètres de la map</h3>
        <label>
          Nom
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <div className="modal-row">
          <label>
            Largeur
            <input
              type="number"
              min={1}
              max={200}
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value, 10) || 1)}
            />
          </label>
          <label>
            Hauteur
            <input
              type="number"
              min={1}
              max={200}
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value, 10) || 1)}
            />
          </label>
        </div>
        {shrinking && (
          <p className="modal-hint" style={{ color: '#ff6b6b' }}>
            Attention : réduire la taille coupe les tiles et events hors de la nouvelle zone.
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary" onClick={submit}>
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
