import type { EventCommand, GameMap } from '@srb/types';
import type { EventEditorMode } from './EventEditor';

interface EventCommandListProps {
  commands: EventCommand[];
  onChange: (next: EventCommand[]) => void;
  mode: EventEditorMode;
  maps: GameMap[];
}

type CommandType = EventCommand['type'];

interface CommandChoice {
  type: CommandType;
  label: string;
  advancedOnly?: boolean;
}

const COMMAND_CHOICES: CommandChoice[] = [
  { type: 'show_text', label: 'Dire un texte' },
  { type: 'transfer', label: 'Téléporter le joueur' },
  { type: 'script', label: 'Code (expert)', advancedOnly: true },
  { type: 'placeholder', label: 'Slot vide', advancedOnly: true },
];

function commandLabel(type: CommandType): string {
  return COMMAND_CHOICES.find((c) => c.type === type)?.label ?? type;
}

function commandPreview(command: EventCommand, maps: GameMap[]): string {
  switch (command.type) {
    case 'show_text': {
      const text = command.text.trim();
      if (!text) return '(texte vide)';
      return text.length > 60 ? `${text.slice(0, 57)}…` : text;
    }
    case 'transfer': {
      const target = maps.find((m) => m.id === command.mapId);
      const mapLabel = target ? target.name : command.mapId ? '(map inconnue)' : '(map à choisir)';
      return `→ ${mapLabel} (${command.x}, ${command.y})`;
    }
    case 'script':
      return command.code.trim() ? command.code.trim().slice(0, 40) : '(code vide)';
    case 'placeholder':
      return '';
  }
}

export function EventCommandList({ commands, onChange, mode, maps }: EventCommandListProps) {
  const isSimple = mode === 'simple';
  const visibleChoices = COMMAND_CHOICES.filter((c) => !isSimple || !c.advancedOnly);

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
      {commands.length === 0 && <p className="muted">Aucune action. Ajoute-en une ci-dessous.</p>}
      {commands.map((cmd, i) => (
        <CommandRow
          key={i}
          command={cmd}
          maps={maps}
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
        {visibleChoices.map((c) => (
          <button key={c.type} type="button" onClick={() => add(c.type)}>
            + {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface CommandRowProps {
  command: EventCommand;
  maps: GameMap[];
  onChange: (next: EventCommand) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function CommandRow({
  command,
  maps,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: CommandRowProps) {
  const preview = commandPreview(command, maps);
  return (
    <div className="event-command-row">
      <div className="event-command-row-header">
        <div className="event-command-title">
          <span className="event-command-type">{commandLabel(command.type)}</span>
          {preview && <span className="event-command-preview">{preview}</span>}
        </div>
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
            placeholder="Texte affiché dans la boîte de dialogue"
            rows={2}
            onChange={(e) => onChange({ ...command, text: e.target.value })}
          />
        )}
        {command.type === 'transfer' && (
          <div className="event-command-grid">
            <label className="event-command-span-2">
              Map cible
              <select
                value={command.mapId}
                onChange={(e) => onChange({ ...command, mapId: e.target.value })}
              >
                <option value="">— choisir une map —</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tile X
              <input
                type="number"
                value={command.x}
                onChange={(e) => onChange({ ...command, x: Number(e.target.value) || 0 })}
              />
            </label>
            <label>
              Tile Y
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
        {command.type === 'placeholder' && <p className="muted">Slot vide.</p>}
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
