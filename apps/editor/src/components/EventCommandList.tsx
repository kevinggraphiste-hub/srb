import type { EventCommand } from '@srb/types';

interface EventCommandListProps {
  commands: EventCommand[];
  onChange: (next: EventCommand[]) => void;
}

type CommandType = EventCommand['type'];

const COMMAND_LABELS: Record<CommandType, string> = {
  show_text: 'show_text',
  transfer: 'transfer',
  script: 'script',
  placeholder: 'placeholder',
};

const COMMAND_CHOICES: CommandType[] = ['show_text', 'transfer', 'script', 'placeholder'];

export function EventCommandList({ commands, onChange }: EventCommandListProps) {
  const add = (type: CommandType): void => {
    onChange([...commands, blankCommand(type)]);
  };

  const update = (index: number, next: EventCommand): void => {
    onChange(commands.map((c, i) => (i === index ? next : c)));
  };

  const remove = (index: number): void => {
    onChange(commands.filter((_, i) => i !== index));
  };

  const move = (index: number, delta: -1 | 1): void => {
    const target = index + delta;
    if (target < 0 || target >= commands.length) return;
    const next = [...commands];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="event-commands-list">
      {commands.length === 0 && <p className="muted">Aucune commande.</p>}
      {commands.map((cmd, i) => (
        <CommandRow
          key={i}
          command={cmd}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
          onMoveUp={() => move(i, -1)}
          onMoveDown={() => move(i, 1)}
          canMoveUp={i > 0}
          canMoveDown={i < commands.length - 1}
        />
      ))}
      <div className="event-commands-add">
        <span className="muted">Ajouter :</span>
        {COMMAND_CHOICES.map((t) => (
          <button key={t} type="button" onClick={() => add(t)}>
            + {COMMAND_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

interface CommandRowProps {
  command: EventCommand;
  onChange: (next: EventCommand) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function CommandRow({
  command,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: CommandRowProps) {
  return (
    <div className="event-command-row">
      <div className="event-command-row-header">
        <span className="event-command-type">{command.type}</span>
        <div className="event-command-row-actions">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} title="Monter">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} title="Descendre">
            ↓
          </button>
          <button type="button" className="danger" onClick={onRemove} title="Supprimer">
            ×
          </button>
        </div>
      </div>
      <div className="event-command-row-body">
        {command.type === 'show_text' && (
          <textarea
            value={command.text}
            placeholder="Texte à afficher"
            rows={2}
            onChange={(e) => onChange({ ...command, text: e.target.value })}
          />
        )}
        {command.type === 'transfer' && (
          <div className="event-command-grid">
            <label>
              mapId
              <input
                value={command.mapId}
                placeholder="map-xxxxxxxx"
                onChange={(e) => onChange({ ...command, mapId: e.target.value })}
              />
            </label>
            <label>
              x
              <input
                type="number"
                value={command.x}
                onChange={(e) => onChange({ ...command, x: Number(e.target.value) || 0 })}
              />
            </label>
            <label>
              y
              <input
                type="number"
                value={command.y}
                onChange={(e) => onChange({ ...command, y: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
        )}
        {command.type === 'script' && (
          <textarea
            value={command.code}
            placeholder="// JS — accès à ctx (sandbox P8)"
            rows={3}
            onChange={(e) => onChange({ ...command, code: e.target.value })}
          />
        )}
        {command.type === 'placeholder' && (
          <p className="muted">Placeholder — emplacement vide.</p>
        )}
      </div>
    </div>
  );
}

function blankCommand(type: CommandType): EventCommand {
  switch (type) {
    case 'show_text':
      return { type: 'show_text', text: '' };
    case 'transfer':
      return { type: 'transfer', mapId: '', x: 0, y: 0 };
    case 'script':
      return { type: 'script', code: '' };
    case 'placeholder':
      return { type: 'placeholder' };
  }
}
