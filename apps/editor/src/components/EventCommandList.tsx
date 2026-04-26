import type {
  EventCommand,
  EventCondition,
  GameMap,
  Project,
  ShowChoicesChoice,
  VariableOperand,
} from '@srb/types';
import { ConditionPicker, SwitchPicker, VariablePicker } from './ConditionPicker';
import type { EventEditorMode } from './EventEditor';

interface EventCommandListProps {
  commands: EventCommand[];
  onChange: (next: EventCommand[]) => void;
  mode: EventEditorMode;
  maps: GameMap[];
  project: Project;
  /** Indentation level, for nested branches inside show_choices / conditional. */
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
  { type: 'set_switch', label: 'Switch — mettre ON/OFF' },
  { type: 'toggle_switch', label: 'Switch — basculer', advancedOnly: true },
  { type: 'set_self_switch', label: 'Self-switch (A/B/C/D)', advancedOnly: true },
  { type: 'set_variable', label: 'Variable — modifier' },
  { type: 'conditional', label: 'Si … alors …' },
  { type: 'script', label: 'Code (expert)', advancedOnly: true },
  { type: 'placeholder', label: 'Slot vide', advancedOnly: true },
];

function commandLabel(type: CommandType): string {
  return COMMAND_CHOICES.find((c) => c.type === type)?.label ?? type;
}

function switchName(project: Project, id: string): string {
  const def = project.switches?.[id];
  if (def?.label) return `${def.label} (${id})`;
  return id || '(non défini)';
}

function variableName(project: Project, id: string): string {
  const def = project.variables?.[id];
  if (def?.label) return `${def.label} (${id})`;
  return id || '(non défini)';
}

function commandPreview(command: EventCommand, maps: GameMap[], project: Project): string {
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
    case 'set_switch':
      return `${switchName(project, command.id)} = ${command.value ? 'ON' : 'OFF'}`;
    case 'toggle_switch':
      return `${switchName(project, command.id)} ↔`;
    case 'set_variable': {
      const rhs =
        typeof command.value === 'number'
          ? String(command.value)
          : `valeur de ${variableName(project, command.value.ref)}`;
      return `${variableName(project, command.id)} ${command.op} ${rhs}`;
    }
    case 'set_self_switch':
      return `Self-switch ${command.id} = ${command.value ? 'ON' : 'OFF'}`;
    case 'conditional': {
      const c = command.cond;
      const desc =
        c.type === 'switch'
          ? `${switchName(project, c.id)} = ${c.value ? 'ON' : 'OFF'}`
          : c.type === 'self_switch'
            ? `self-switch ${c.id} = ${c.value ? 'ON' : 'OFF'}`
            : c.type === 'variable'
              ? `${variableName(project, c.id)} ${c.op} ${c.value}`
              : `item ${c.itemId}`;
      const elsePart = command.else && command.else.length > 0 ? ' / sinon' : '';
      return `Si ${desc}${elsePart}`;
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
  project,
  depth = 0,
}: EventCommandListProps) {
  const isSimple = mode === 'simple';
  const visibleChoices = COMMAND_CHOICES.filter((c) => !isSimple || !c.advancedOnly);

  const add = (type: CommandType): void => {
    onChange([...commands, blankCommand(type, project)]);
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
          project={project}
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
  project: Project;
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
  project,
  mode,
  depth,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: CommandRowProps) {
  const preview = commandPreview(command, maps, project);
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
          <ShowChoicesEditor
            command={command}
            maps={maps}
            project={project}
            mode={mode}
            depth={depth}
            onChange={onChange}
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
        {command.type === 'set_switch' && (
          <div className="event-command-grid">
            <label className="event-command-span-2">
              Switch
              <SwitchPicker
                project={project}
                value={command.id}
                onChange={(id) => onChange({ ...command, id })}
              />
            </label>
            <label>
              Valeur
              <select
                value={String(command.value)}
                onChange={(e) => onChange({ ...command, value: e.target.value === 'true' })}
              >
                <option value="true">ON</option>
                <option value="false">OFF</option>
              </select>
            </label>
          </div>
        )}
        {command.type === 'toggle_switch' && (
          <div className="event-command-grid">
            <label className="event-command-span-2">
              Switch à basculer
              <SwitchPicker
                project={project}
                value={command.id}
                onChange={(id) => onChange({ ...command, id })}
              />
            </label>
          </div>
        )}
        {command.type === 'set_self_switch' && (
          <div className="event-command-grid">
            <label>
              Self-switch
              <select
                value={command.id}
                onChange={(e) =>
                  onChange({ ...command, id: e.target.value as 'A' | 'B' | 'C' | 'D' })
                }
              >
                {(['A', 'B', 'C', 'D'] as const).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Valeur
              <select
                value={String(command.value)}
                onChange={(e) => onChange({ ...command, value: e.target.value === 'true' })}
              >
                <option value="true">ON</option>
                <option value="false">OFF</option>
              </select>
            </label>
          </div>
        )}
        {command.type === 'set_variable' && (
          <SetVariableEditor command={command} project={project} onChange={onChange} />
        )}
        {command.type === 'conditional' && (
          <ConditionalEditor
            command={command}
            maps={maps}
            project={project}
            mode={mode}
            depth={depth}
            onChange={onChange}
          />
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

interface SetVariableEditorProps {
  command: Extract<EventCommand, { type: 'set_variable' }>;
  project: Project;
  onChange: (next: EventCommand) => void;
}

function SetVariableEditor({ command, project, onChange }: SetVariableEditorProps) {
  const operandKind = typeof command.value === 'number' ? 'literal' : 'ref';
  const literal = typeof command.value === 'number' ? command.value : 0;
  const ref = typeof command.value === 'number' ? '' : command.value.ref;

  const setKind = (kind: 'literal' | 'ref'): void => {
    const next: VariableOperand = kind === 'literal' ? literal : { ref };
    onChange({ ...command, value: next });
  };

  return (
    <div className="event-command-grid">
      <label className="event-command-span-2">
        Variable
        <VariablePicker
          project={project}
          value={command.id}
          onChange={(id) => onChange({ ...command, id })}
        />
      </label>
      <label>
        Opération
        <select
          value={command.op}
          onChange={(e) =>
            onChange({ ...command, op: e.target.value as typeof command.op })
          }
        >
          {(['=', '+=', '-=', '*=', '/='] as const).map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </label>
      <label>
        Valeur de
        <select value={operandKind} onChange={(e) => setKind(e.target.value as 'literal' | 'ref')}>
          <option value="literal">Nombre</option>
          <option value="ref">Autre variable</option>
        </select>
      </label>
      {operandKind === 'literal' ? (
        <label>
          Nombre
          <input
            type="number"
            value={literal}
            onChange={(e) =>
              onChange({ ...command, value: Number(e.target.value) || 0 })
            }
          />
        </label>
      ) : (
        <label className="event-command-span-2">
          Variable source
          <VariablePicker
            project={project}
            value={ref}
            onChange={(id) => onChange({ ...command, value: { ref: id } })}
          />
        </label>
      )}
    </div>
  );
}

interface ConditionalEditorProps {
  command: Extract<EventCommand, { type: 'conditional' }>;
  maps: GameMap[];
  project: Project;
  mode: EventEditorMode;
  depth: number;
  onChange: (next: EventCommand) => void;
}

function ConditionalEditor({
  command,
  maps,
  project,
  mode,
  depth,
  onChange,
}: ConditionalEditorProps) {
  const hasElse = command.else !== undefined;

  const setCond = (cond: EventCondition): void => {
    onChange({ ...command, cond });
  };

  const setThen = (then: EventCommand[]): void => {
    onChange({ ...command, then });
  };

  const setElse = (next: EventCommand[]): void => {
    onChange({ ...command, else: next });
  };

  const toggleElse = (): void => {
    if (hasElse) {
      const { else: _drop, ...rest } = command;
      void _drop;
      onChange({ ...rest });
    } else {
      onChange({ ...command, else: [] });
    }
  };

  return (
    <div className="event-conditional-editor">
      <div className="event-conditional-cond">
        <span className="muted">Si</span>
        <ConditionPicker condition={command.cond} project={project} onChange={setCond} />
      </div>
      <div className="event-conditional-branch">
        <span className="muted">Alors :</span>
        <EventCommandList
          commands={command.then}
          onChange={setThen}
          mode={mode}
          maps={maps}
          project={project}
          depth={depth + 1}
        />
      </div>
      <div className="event-conditional-else-toggle">
        <button type="button" onClick={toggleElse}>
          {hasElse ? '− Retirer le « Sinon »' : '+ Ajouter un « Sinon »'}
        </button>
      </div>
      {hasElse && (
        <div className="event-conditional-branch">
          <span className="muted">Sinon :</span>
          <EventCommandList
            commands={command.else ?? []}
            onChange={setElse}
            mode={mode}
            maps={maps}
            project={project}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  );
}

interface ShowChoicesEditorProps {
  command: Extract<EventCommand, { type: 'show_choices' }>;
  maps: GameMap[];
  project: Project;
  mode: EventEditorMode;
  depth: number;
  onChange: (next: EventCommand) => void;
}

function ShowChoicesEditor({
  command,
  maps,
  project,
  mode,
  depth,
  onChange,
}: ShowChoicesEditorProps) {
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
                project={project}
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

function blankCommand(type: CommandType, project: Project): EventCommand {
  const firstSwitchId = Object.keys(project.switches ?? {})[0] ?? '';
  const firstVariableId = Object.keys(project.variables ?? {})[0] ?? '';
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
    case 'set_switch':
      return { type: 'set_switch', id: firstSwitchId, value: true };
    case 'toggle_switch':
      return { type: 'toggle_switch', id: firstSwitchId };
    case 'set_variable':
      return { type: 'set_variable', id: firstVariableId, op: '=', value: 0 };
    case 'set_self_switch':
      return { type: 'set_self_switch', id: 'A', value: true };
    case 'conditional':
      return {
        type: 'conditional',
        cond: { type: 'switch', id: firstSwitchId, value: true },
        then: [],
      };
    case 'script':
      return { type: 'script', code: '' };
    case 'placeholder':
      return { type: 'placeholder' };
  }
}
