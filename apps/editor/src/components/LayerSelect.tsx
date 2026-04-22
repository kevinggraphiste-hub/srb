export type EditableLayer = 'ground' | 'detail' | 'objects';
export type RenderableLayer = 'background' | 'ground' | 'detail' | 'objects' | 'overlay';

const EDITABLE: Array<{ id: EditableLayer; label: string }> = [
  { id: 'ground', label: 'Ground' },
  { id: 'detail', label: 'Detail' },
  { id: 'objects', label: 'Objects' },
];

const VISIBILITY: Array<{ id: RenderableLayer; label: string }> = [
  { id: 'background', label: 'Background' },
  { id: 'ground', label: 'Ground' },
  { id: 'detail', label: 'Detail' },
  { id: 'objects', label: 'Objects' },
  { id: 'overlay', label: 'Overlay' },
];

interface LayerSelectProps {
  active: EditableLayer;
  onChange: (layer: EditableLayer) => void;
  hiddenLayers: Set<RenderableLayer>;
  onToggleVisibility: (layer: RenderableLayer) => void;
}

export function LayerSelect({ active, onChange, hiddenLayers, onToggleVisibility }: LayerSelectProps) {
  return (
    <div className="layer-select">
      <h2 style={{ padding: 0, border: 0 }}>Couche active</h2>
      {EDITABLE.map((l) => (
        <button
          key={l.id}
          type="button"
          className={l.id === active ? 'active' : ''}
          onClick={() => onChange(l.id)}
        >
          {l.label}
        </button>
      ))}
      <h2 style={{ padding: '8px 0 4px', border: 0, marginTop: 8 }}>Visibilité</h2>
      {VISIBILITY.map((l) => {
        const visible = !hiddenLayers.has(l.id);
        return (
          <button
            key={`vis-${l.id}`}
            type="button"
            className="layer-visibility"
            onClick={() => onToggleVisibility(l.id)}
            title={visible ? 'Cliquer pour cacher' : 'Cliquer pour afficher'}
          >
            <span className="visibility-icon">{visible ? '👁' : '—'}</span>
            <span className={visible ? '' : 'dimmed'}>{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
