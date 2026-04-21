import { TILE_REGISTRY } from '@srb/engine';

interface PaletteProps {
  selectedTileId: number;
  onSelect: (tileId: number) => void;
}

export function Palette({ selectedTileId, onSelect }: PaletteProps) {
  const entries = Object.entries(TILE_REGISTRY)
    .map(([k, v]) => ({ id: Number(k), ...v }))
    .sort((a, b) => a.id - b.id);

  return (
    <div className="palette-list">
      {entries.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`palette-tile${t.id === selectedTileId ? ' active' : ''}`}
          style={{ background: `#${t.color.toString(16).padStart(6, '0')}` }}
          title={`${t.label} (id ${t.id})`}
          onClick={() => onSelect(t.id)}
        >
          <span className="label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
