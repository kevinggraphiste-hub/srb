export type EditableLayer = 'ground' | 'detail' | 'objects';

const LAYERS: Array<{ id: EditableLayer; label: string }> = [
  { id: 'ground', label: 'Ground' },
  { id: 'detail', label: 'Detail' },
  { id: 'objects', label: 'Objects' },
];

interface LayerSelectProps {
  active: EditableLayer;
  onChange: (layer: EditableLayer) => void;
}

export function LayerSelect({ active, onChange }: LayerSelectProps) {
  return (
    <div className="layer-select">
      <h2 style={{ padding: 0, border: 0 }}>Couche active</h2>
      {LAYERS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={l.id === active ? 'active' : ''}
          onClick={() => onChange(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
