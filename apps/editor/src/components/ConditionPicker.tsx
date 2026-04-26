import type { EventCondition, Project } from '@srb/types';

interface ConditionPickerProps {
  condition: EventCondition;
  project: Project;
  onChange: (next: EventCondition) => void;
}

/**
 * Edits a single EventCondition. Used both by event-page conditions
 * (a page is active iff all its conditions match) and by the `conditional`
 * command (the cond field). Renders a type selector + the appropriate
 * inputs for that type.
 */
export function ConditionPicker({ condition, project, onChange }: ConditionPickerProps) {
  const setType = (type: EventCondition['type']): void => {
    if (condition.type === type) return;
    onChange(blankCondition(type, project));
  };

  return (
    <div className="condition-picker">
      <select value={condition.type} onChange={(e) => setType(e.target.value as EventCondition['type'])}>
        <option value="switch">Switch (ON/OFF)</option>
        <option value="variable">Variable (entier)</option>
        <option value="self_switch">Self-switch (A/B/C/D)</option>
        <option value="item_owned">Item possédé</option>
      </select>
      {condition.type === 'switch' && (
        <>
          <SwitchPicker
            project={project}
            value={condition.id}
            onChange={(id) => onChange({ ...condition, id })}
          />
          <select
            value={String(condition.value)}
            onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
          >
            <option value="true">est ON</option>
            <option value="false">est OFF</option>
          </select>
        </>
      )}
      {condition.type === 'variable' && (
        <>
          <VariablePicker
            project={project}
            value={condition.id}
            onChange={(id) => onChange({ ...condition, id })}
          />
          <select
            value={condition.op}
            onChange={(e) =>
              onChange({ ...condition, op: e.target.value as '=' | '>=' | '<=' | '>' | '<' })
            }
          >
            {(['=', '>=', '<=', '>', '<'] as const).map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={condition.value}
            onChange={(e) => onChange({ ...condition, value: Number(e.target.value) || 0 })}
          />
        </>
      )}
      {condition.type === 'self_switch' && (
        <>
          <select
            value={condition.id}
            onChange={(e) =>
              onChange({ ...condition, id: e.target.value as 'A' | 'B' | 'C' | 'D' })
            }
          >
            {(['A', 'B', 'C', 'D'] as const).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={String(condition.value)}
            onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
          >
            <option value="true">est ON</option>
            <option value="false">est OFF</option>
          </select>
        </>
      )}
      {condition.type === 'item_owned' && (
        <input
          placeholder="itemId (P4+)"
          value={condition.itemId}
          onChange={(e) => onChange({ ...condition, itemId: e.target.value })}
        />
      )}
    </div>
  );
}

interface SwitchPickerProps {
  project: Project;
  value: string;
  onChange: (id: string) => void;
}

export function SwitchPicker({ project, value, onChange }: SwitchPickerProps) {
  const entries = Object.entries(project.switches ?? {});
  if (entries.length === 0) {
    return (
      <input
        value={value}
        placeholder="id (Projet › Switches & variables)"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  const knownIds = new Set(entries.map(([id]) => id));
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— choisir un switch —</option>
      {entries.map(([id, def]) => (
        <option key={id} value={id}>
          {def.label ? `${def.label} (${id})` : id}
        </option>
      ))}
      {value && !knownIds.has(value) && (
        <option value={value}>(inconnu) {value}</option>
      )}
    </select>
  );
}

interface VariablePickerProps {
  project: Project;
  value: string;
  onChange: (id: string) => void;
}

export function VariablePicker({ project, value, onChange }: VariablePickerProps) {
  const entries = Object.entries(project.variables ?? {});
  if (entries.length === 0) {
    return (
      <input
        value={value}
        placeholder="id (Projet › Switches & variables)"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  const knownIds = new Set(entries.map(([id]) => id));
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— choisir une variable —</option>
      {entries.map(([id, def]) => (
        <option key={id} value={id}>
          {def.label ? `${def.label} (${id})` : id}
        </option>
      ))}
      {value && !knownIds.has(value) && (
        <option value={value}>(inconnue) {value}</option>
      )}
    </select>
  );
}

function blankCondition(type: EventCondition['type'], project: Project): EventCondition {
  const firstSwitchId = Object.keys(project.switches ?? {})[0] ?? '';
  const firstVariableId = Object.keys(project.variables ?? {})[0] ?? '';
  switch (type) {
    case 'switch':
      return { type: 'switch', id: firstSwitchId, value: true };
    case 'variable':
      return { type: 'variable', id: firstVariableId, op: '>=', value: 0 };
    case 'self_switch':
      return { type: 'self_switch', id: 'A', value: true };
    case 'item_owned':
      return { type: 'item_owned', itemId: '' };
  }
}
