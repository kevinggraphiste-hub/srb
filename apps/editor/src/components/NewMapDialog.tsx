import { useState } from 'react';

interface NewMapDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (params: { name: string; width: number; height: number }) => void;
}

export function NewMapDialog({ open, onClose, onCreate }: NewMapDialogProps) {
  const [name, setName] = useState('Nouvelle map');
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(15);

  if (!open) return null;

  const submit = (): void => {
    if (width < 1 || height < 1 || width > 200 || height > 200) return;
    onCreate({ name: name.trim() || 'Nouvelle map', width, height });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nouvelle map</h3>
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
        <p className="modal-hint">
          Intérieur : 10×8 à 20×15. Ville : 30×30 à 50×50. Overworld : 80×80+.
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary" onClick={submit}>
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
