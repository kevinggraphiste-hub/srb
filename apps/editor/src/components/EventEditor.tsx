import { useMemo, useState } from 'react';
import type {
  EventCommand,
  EventCondition,
  EventPage,
  EventTrigger,
  MapEvent,
  MovementPattern,
} from '@srb/types';
import { createBlankEventPage } from '../data/events';
import { EventCommandList } from './EventCommandList';

interface EventEditorProps {
  event: MapEvent;
  onChange: (next: MapEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TRIGGERS: EventTrigger[] = ['action', 'contact', 'auto', 'parallel'];
const MOVEMENTS: Array<MovementPattern['type']> = ['fixed', 'random', 'approach', 'custom'];
const DIRECTIONS: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

export function EventEditor({ event, onChange, onDelete, onClose }: EventEditorProps) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const safeIndex = Math.min(activePageIndex, event.pages.length - 1);
  const page = event.pages[safeIndex]!;

  const updatePage = (patch: Partial<EventPage>): void => {
    const nextPages = event.pages.map((p, i) => (i === safeIndex ? { ...p, ...patch } : p));
    onChange({ ...event, pages: nextPages });
  };

  const updateCommands = (commands: EventCommand[]): void => {
    updatePage({ commands });
  };

  const updateConditions = (conditions: EventCondition[]): void => {
    updatePage({ conditions });
  };

  const addPage = (): void => {
    const nextPages = [...event.pages, createBlankEventPage()];
    onChange({ ...event, pages: nextPages });
    setActivePageIndex(nextPages.length - 1);
  };

  const duplicatePage = (): void => {
    const clone: EventPage = JSON.parse(JSON.stringify(page));
    const nextPages = [...event.pages];
    nextPages.splice(safeIndex + 1, 0, clone);
    onChange({ ...event, pages: nextPages });
    setActivePageIndex(safeIndex + 1);
  };

  const deletePage = (): void => {
    if (event.pages.length <= 1) return;
    const nextPages = event.pages.filter((_, i) => i !== safeIndex);
    onChange({ ...event, pages: nextPages });
    setActivePageIndex(Math.max(0, safeIndex - 1));
  };

  const movementLabel = useMemo(() => page.movement.type, [page.movement]);

  return (
    <div className="event-editor">
      <header className="event-editor-header">
        <input
          className="event-name-input"
          value={event.name}
          onChange={(e) => onChange({ ...event, name: e.target.value })}
        />
        <span className="event-coords">
          ({event.x}, {event.y})
        </span>
        <div className="event-editor-actions">
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (window.confirm(`Supprimer l'event « ${event.name} » ?`)) onDelete(event.id);
            }}
            title="Supprimer cet event"
          >
            Supprimer
          </button>
          <button type="button" onClick={onClose} title="Fermer (désélectionne)">
            ✕
          </button>
        </div>
      </header>

      <div className="event-pages-tabs">
        {event.pages.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === safeIndex ? 'active' : ''}
            onClick={() => setActivePageIndex(i)}
            title={`Page ${i + 1}`}
          >
            P{i + 1}
          </button>
        ))}
        <button type="button" onClick={addPage} title="Ajouter une page">
          +
        </button>
        <button
          type="button"
          onClick={duplicatePage}
          title="Dupliquer la page active"
          disabled={event.pages.length === 0}
        >
          ⎘
        </button>
        <button
          type="button"
          onClick={deletePage}
          title="Supprimer la page active"
          disabled={event.pages.length <= 1}
          className="danger"
        >
          −
        </button>
      </div>

      <section className="event-page-body">
        <div className="event-field">
          <label>Trigger</label>
          <select
            value={page.trigger}
            onChange={(e) => updatePage({ trigger: e.target.value as EventTrigger })}
          >
            {TRIGGERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="event-field">
          <label>Mouvement</label>
          <select
            value={movementLabel}
            onChange={(e) => {
              const type = e.target.value as MovementPattern['type'];
              updatePage({
                movement:
                  type === 'custom' ? { type: 'custom', route: [] } : ({ type } as MovementPattern),
              });
            }}
          >
            {MOVEMENTS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="event-graphic">
          <legend>Apparence</legend>
          <div className="event-field">
            <label>Sprite ID</label>
            <input
              value={page.graphic.spriteId ?? ''}
              placeholder="(invisible)"
              onChange={(e) =>
                updatePage({
                  graphic: {
                    ...page.graphic,
                    spriteId: e.target.value ? e.target.value : null,
                  },
                })
              }
            />
          </div>
          <div className="event-field">
            <label>Direction</label>
            <select
              value={page.graphic.direction}
              onChange={(e) =>
                updatePage({
                  graphic: { ...page.graphic, direction: e.target.value as (typeof DIRECTIONS)[number] },
                })
              }
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="event-field">
            <label>Frame</label>
            <input
              type="number"
              value={page.graphic.frame}
              onChange={(e) =>
                updatePage({
                  graphic: { ...page.graphic, frame: Number(e.target.value) || 0 },
                })
              }
            />
          </div>
        </fieldset>

        <ConditionsEditor conditions={page.conditions} onChange={updateConditions} />

        <fieldset className="event-commands">
          <legend>Commandes</legend>
          <EventCommandList commands={page.commands} onChange={updateCommands} />
        </fieldset>
      </section>
    </div>
  );
}

interface ConditionsEditorProps {
  conditions: EventCondition[];
  onChange: (next: EventCondition[]) => void;
}

function ConditionsEditor({ conditions, onChange }: ConditionsEditorProps) {
  const add = (type: EventCondition['type']): void => {
    const fresh: EventCondition =
      type === 'switch'
        ? { type: 'switch', id: '', value: true }
        : type === 'variable'
          ? { type: 'variable', id: '', op: '>=', value: 0 }
          : type === 'self_switch'
            ? { type: 'self_switch', id: 'A', value: true }
            : { type: 'item_owned', itemId: '' };
    onChange([...conditions, fresh]);
  };

  const update = (index: number, next: EventCondition): void => {
    onChange(conditions.map((c, i) => (i === index ? next : c)));
  };

  const remove = (index: number): void => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <fieldset className="event-conditions">
      <legend>Conditions</legend>
      {conditions.length === 0 && <p className="muted">Aucune — page toujours active.</p>}
      {conditions.map((c, i) => (
        <ConditionRow key={i} condition={c} onChange={(next) => update(i, next)} onRemove={() => remove(i)} />
      ))}
      <div className="event-conditions-add">
        <button type="button" onClick={() => add('switch')}>
          + switch
        </button>
        <button type="button" onClick={() => add('variable')}>
          + variable
        </button>
        <button type="button" onClick={() => add('self_switch')}>
          + self_switch
        </button>
        <button type="button" onClick={() => add('item_owned')}>
          + item_owned
        </button>
      </div>
    </fieldset>
  );
}

interface ConditionRowProps {
  condition: EventCondition;
  onChange: (next: EventCondition) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, onChange, onRemove }: ConditionRowProps) {
  return (
    <div className="event-condition-row">
      <span className="event-condition-type">{condition.type}</span>
      {condition.type === 'switch' && (
        <>
          <input
            placeholder="id"
            value={condition.id}
            onChange={(e) => onChange({ ...condition, id: e.target.value })}
          />
          <select
            value={String(condition.value)}
            onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
          >
            <option value="true">ON</option>
            <option value="false">OFF</option>
          </select>
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
            <option value="true">ON</option>
            <option value="false">OFF</option>
          </select>
        </>
      )}
      {condition.type === 'variable' && (
        <>
          <input
            placeholder="id"
            value={condition.id}
            onChange={(e) => onChange({ ...condition, id: e.target.value })}
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
      {condition.type === 'item_owned' && (
        <input
          placeholder="itemId"
          value={condition.itemId}
          onChange={(e) => onChange({ ...condition, itemId: e.target.value })}
        />
      )}
      <button type="button" className="danger" onClick={onRemove} title="Retirer">
        ×
      </button>
    </div>
  );
}
