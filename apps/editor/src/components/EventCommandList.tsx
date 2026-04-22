import type { EventCommand, GameMap, ShowChoicesChoice } from '@srb/types';
import type { EventEditorMode } from './EventEditor';

interface EventCommandListProps {
  commands: EventCommand[];
  onChange: (next: EventCommand[]) => void;
  mode: EventEditorMode;
  maps: GameMap[];
  /** Indentation level, for nested branches inside show_choices. */
  depth?: number;
}

type CommandType = EventCommand['type'];

interface CommandChoice {
  type: CommandType;
  label: string;
  advancedOnly?: boolean;
}

const COMMAND_CHOICES: CommandChoice[] = [
  { type: 'show_text', label: 'Dire un texte' },
  { type: 'show_choices', label: 'Poser une question (choix)' },
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
      const prefix = command.speaker ? `${command.speaker} — ` : '';
      if (!text) return `${prefix}(texte vide)`;
      const short = text.length > 60 ? `${text.slice(0, 57)}…` : text;
      return `${prefix}${short}`;
    }
    case 'show_choices': {
      const n = command.choices.length;
      const first = command.choices[0]?.label ?? '';
      if (n === 0) return '(aucun choix)';
      if (n === 1) return `1 choix : ${first}`;
      return `${n} choix`;
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

export function EventCommandList({
  commands,
  onChange,
  mode,
  maps,
  depth = 0,
}: EventCommandListProps) {
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
    <div className="event-commands-list" data-depth={depth}>
      {commands.length === 0 && <p className="muted">Aucune action. Ajoute-en une ci-dessous.</p>}
      {commands.map((cmd, i) => (
        <CommandRow
          key={i}
          command={cmd}
          maps={maps}
          mode={mode}
          depth={depth}
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
  mode: EventEditorMode;
  depth: number;
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
  mode,
  depth,
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
          <div className="event-command-grid">
            <label className="event-command-span-2">
              Texte
              <textarea
                value={command.text}
                placeholder="Texte affiché dans la boîte de dialogue"
                rows={2}
                onChange={(e) => onChange({ ...command, text: e.target.value })}
              />
            </label>
            <label className="event-command-span-2">
              Nom du locuteur <span className="muted">(optionnel)</span>
              <input
                value={command.speaker ?? ''}
                placeholder="Ex: Elara, Forgeron…"
                onChange={(e) =>
                  onChange({
                    ...command,
                    speaker: e.target.value ? e.target.value : undefined,
                  })
                }
              />
            </label>
          </div>
        )}
        {command.type === 'show_choices' && (
          <ShowChoicesEditor command={command} maps={maps} mode={mode} depth={depth} onChange={onChange} />
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

interface ShowChoicesEditorProps {
  command: Extract<EventCommand, { type: 'show_choices' }>;
  maps: GameMap[];
  mode: EventEditorMode;
  depth: number;
  onChange: (next: EventCommand) => void;
}

function ShowChoicesEditor({ command, maps, mode, depth, onChange }: ShowChoicesEditorProps) {
  const updateChoice = (index: number, patch: Partial<ShowChoicesChoice>): void => {
    const next: ShowChoicesChoice[] = command.choices.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
    onChange({ ...command, choices: next });
  };

  const addChoice = (): void => {
    const next: ShowChoicesChoice[] = [
      ...command.choices,
      { label: `Choix ${command.choices.length + 1}`, branch: [] },
    ];
    onChange({ ...command, choices: next });
  };

  const removeChoice = (index: number): void => {
    const next = command.choices.filter((_, i) => i !== index);
    const cancelIndex =
      command.cancelIndex !== undefined && command.cancelIndex >= next.length
        ? undefined
        : command.cancelIndex;
    onChange({ ...command, choices: next, cancelIndex });
  };

  const moveChoice = (index: number, delta: -1 | 1): void => {
    const target = index + delta;
    if (target < 0 || target >= command.choices.length) return;
    const next = [...command.choices];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onChange({ ...command, choices: next });
  };

  const isAdvanced = mode === 'advanced';
  return (
    <div className="event-choices-editor">
      <label className="event-command-span-2">
        Question
        <textarea
          value={command.prompt}
          placeholder="Ex: Tu acceptes la quête ?"
          rows={2}
          onChange={(e) => onChange({ ...command, prompt: e.target.value })}
        />
      </label>
      <div className="event-choices-list">
        {command.choices.length === 0 && (
          <p className="muted">Aucun choix. Clique « + Ajouter un choix » ci-dessous.</p>
        )}
        {command.choices.map((choice, i) => (
          <div key={i} className="event-choice-row">
            <div className="event-choice-header">
              <span className="event-choice-index">Choix {i + 1}</span>
              <input
                className="event-choice-label"
                value={choice.label}
                placeholder={`Libellé du choix ${i + 1}`}
                onChange={(e) => updateChoice(i, { label: e.target.value })}
              />
              <div className="event-choice-actions">
                <button
                  type="button"
                  onClick={() => moveChoice(i, -1)}
                  disabled={i === 0}
                  title="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveChoice(i, 1)}
                  disabled={i === command.choices.length - 1}
                  title="Descendre"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => removeChoice(i)}
                  title="Retirer ce choix"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="event-choice-branch">
              <span className="muted">Actions si ce choix est pris :</span>
              <EventCommandList
                commands={choice.branch}
                onChange={(next) => updateChoice(i, { branch: next })}
                mode={mode}
                maps={maps}
                depth={depth + 1}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="event-choices-controls">
        <button type="button" onClick={addChoice}>
          + Ajouter un choix
        </button>
        {isAdvanced && command.choices.length > 0 && (
          <label className="event-choices-cancel">
            Échap = choix n°
            <select
              value={command.cancelIndex ?? ''}
              onChange={(e) =>
                onChange({
                  ...command,
                  cancelIndex: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            >
              <option value="">(désactivé)</option>
              {command.choices.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

function blankCommand(type: CommandType): EventCommand {
  switch (type) {
    case 'show_text':
      return { type: 'show_text', text: '' };
    case 'show_choices':
      return {
        type: 'show_choices',
        prompt: 'Tu fais quoi ?',
        choices: [
          { label: 'Oui', branch: [] },
          { label: 'Non', branch: [] },
        ],
      };
    case 'transfer':
      return { type: 'transfer', mapId: '', x: 0, y: 0 };
    case 'script':
      return { type: 'script', code: '' };
    case 'placeholder':
      return { type: 'placeholder' };
  }
}
