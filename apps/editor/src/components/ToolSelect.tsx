export type Tool = 'stamp' | 'eraser' | 'rect' | 'fill' | 'event';

const TOOLS: Array<{ id: Tool; label: string; hint: string }> = [
  { id: 'stamp', label: 'Stamp', hint: 'B' },
  { id: 'eraser', label: 'Eraser', hint: 'E' },
  { id: 'rect', label: 'Rect', hint: 'R' },
  { id: 'fill', label: 'Fill', hint: 'F' },
  { id: 'event', label: 'Event', hint: 'V' },
];

interface ToolSelectProps {
  active: Tool;
  onChange: (tool: Tool) => void;
}

export function ToolSelect({ active, onChange }: ToolSelectProps) {
  return (
    <div className="tool-select">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={t.id === active ? 'active' : ''}
          onClick={() => onChange(t.id)}
          title={`${t.label} (${t.hint})`}
        >
          {t.label}
          <span className="hint">{t.hint}</span>
        </button>
      ))}
    </div>
  );
}
