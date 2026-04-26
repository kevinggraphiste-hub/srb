import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  EventCondition,
  EventPage,
  EventTrigger,
  GameMap,
  MapEvent,
  MovementPattern,
  Project,
} from '@srb/types';
import { createBlankEventPage } from '../data/events';
import { ConditionPicker } from './ConditionPicker';
import { EventCommandList } from './EventCommandList';
import { SpriteSelector } from './SpriteSelector';

export type EventEditorMode = 'simple' | 'advanced';

const MODE_STORAGE_KEY = 'srb-editor:event-panel-mode';

export function useEventEditorMode(): [EventEditorMode, (next: EventEditorMode) => void] {
  const [mode, setMode] = useState<EventEditorMode>(() => {
    if (typeof window === 'undefined') return 'simple';
    const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
    return raw === 'advanced' ? 'advanced' : 'simple';
  });
  useEffect(() => {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);
  return [mode, setMode];
}

interface EventEditorProps {
  event: MapEvent;
  project: Project;
  mode: EventEditorMode;
  onModeChange: (next: EventEditorMode) => void;
  onChange: (next: MapEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

interface TriggerOption {
  value: EventTrigger;
  label: string;
  hint: string;
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  { value: 'action', label: 'Le joueur interagit', hint: 'Touche action face à l’event' },
  { value: 'contact', label: 'Le joueur marche dessus', hint: 'Déclenché au contact' },
  { value: 'auto', label: 'Automatique (1 fois)', hint: 'Dès que la variante s’active' },
  { value: 'parallel', label: 'En boucle de fond', hint: 'Tourne en continu' },
];

interface MovementOption {
  value: MovementPattern['type'];
  label: string;
}

const MOVEMENT_OPTIONS: MovementOption[] = [
  { value: 'fixed', label: 'Immobile' },
  { value: 'random', label: 'Aléatoire' },
  { value: 'approach', label: 'Suit le joueur' },
  { value: 'custom', label: 'Trajet personnalisé' },
];

interface DirectionOption {
  value: 'up' | 'down' | 'left' | 'right';
  label: string;
  arrow: string;
}

const DIRECTION_OPTIONS: DirectionOption[] = [
  { value: 'up', label: 'Haut', arrow: '↑' },
  { value: 'down', label: 'Bas', arrow: '↓' },
  { value: 'left', label: 'Gauche', arrow: '←' },
  { value: 'right', label: 'Droite', arrow: '→' },
];

export function EventEditor({
  event,
  project,
  mode,
  onModeChange,
  onChange,
  onDelete,
  onClose,
}: EventEditorProps) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const safeIndex = Math.min(activePageIndex, event.pages.length - 1);
  const page = event.pages[safeIndex]!;
  const isSimple = mode === 'simple';

  const mapsInProject = useMemo<GameMap[]>(
    () =>
      project.items
        .filter((item): item is { type: 'map'; map: GameMap } => item.type === 'map')
        .map((item) => item.map),
    [project.items],
  );

  const updatePage = useCallback(
    (patch: Partial<EventPage>): void => {
      const nextPages = event.pages.map((p, i) => (i === safeIndex ? { ...p, ...patch } : p));
      onChange({ ...event, pages: nextPages });
    },
    [event, onChange, safeIndex],
  );

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

  return (
    <div className="event-editor">
      <header className="event-editor-header">
        <input
          className="event-name-input"
          value={event.name}
          onChange={(e) => onChange({ ...event, name: e.target.value })}
          aria-label="Nom de l’event"
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

      <div className="event-mode-toggle">
        <button
          type="button"
          className={isSimple ? 'active' : ''}
          onClick={() => onModeChange('simple')}
          title="Masque les options avancées (conditions, déplacement, script)"
        >
          Mode simple
        </button>
        <button
          type="button"
          className={!isSimple ? 'active' : ''}
          onClick={() => onModeChange('advanced')}
          title="Toutes les options RPG-Maker"
        >
          Mode avancé
        </button>
      </div>

      <div className="event-pages-tabs">
        <span className="event-pages-label">Variantes :</span>
        {event.pages.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === safeIndex ? 'active' : ''}
            onClick={() => setActivePageIndex(i)}
            title={`Variante ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" onClick={addPage} title="Ajouter une variante">
          +
        </button>
        <button
          type="button"
          onClick={duplicatePage}
          title="Dupliquer la variante active"
          disabled={event.pages.length === 0}
        >
          ⎘
        </button>
        <button
          type="button"
          onClick={deletePage}
          title="Supprimer la variante active"
          disabled={event.pages.length <= 1}
          className="danger"
        >
          −
        </button>
      </div>

      <section className="event-page-body">
        <fieldset className="event-section">
          <legend>Quand ça se déclenche</legend>
          <div className="event-trigger-choices">
            {TRIGGER_OPTIONS.map((t) => (
              <label
                key={t.value}
                className={`event-radio ${page.trigger === t.value ? 'active' : ''}`}
                title={t.hint}
              >
                <input
                  type="radio"
                  name={`trigger-${event.id}-${safeIndex}`}
                  checked={page.trigger === t.value}
                  onChange={() => updatePage({ trigger: t.value })}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="event-section">
          <legend>Apparence</legend>
          <div className="event-field">
            <label>Sprite</label>
            <SpriteSelector
              value={page.graphic.spriteId}
              mode={mode}
              onChange={(next) =>
                updatePage({ graphic: { ...page.graphic, spriteId: next } })
              }
            />
          </div>
          {!isSimple && (
            <>
              <div className="event-field">
                <label>Direction</label>
                <div className="event-direction-choices">
                  {DIRECTION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      className={page.graphic.direction === d.value ? 'active' : ''}
                      title={d.label}
                      onClick={() =>
                        updatePage({ graphic: { ...page.graphic, direction: d.value } })
                      }
                    >
                      {d.arrow}
                    </button>
                  ))}
                </div>
              </div>
              <div className="event-field">
                <label>Frame</label>
                <input
                  type="number"
                  value={page.graphic.frame}
                  onChange={(e) =>
                    updatePage({ graphic: { ...page.graphic, frame: Number(e.target.value) || 0 } })
                  }
                />
              </div>
            </>
          )}
        </fieldset>

        {!isSimple && (
          <fieldset className="event-section">
            <legend>Déplacement (entre interactions)</legend>
            <select
              value={page.movement.type}
              onChange={(e) => {
                const type = e.target.value as MovementPattern['type'];
                updatePage({
                  movement:
                    type === 'custom' ? { type: 'custom', route: [] } : ({ type } as MovementPattern),
                });
              }}
            >
              {MOVEMENT_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        {!isSimple && (
          <ConditionsEditor
            conditions={page.conditions}
            project={project}
            onChange={(conditions) => updatePage({ conditions })}
          />
        )}

        <fieldset className="event-section">
          <legend>Actions (à l’activation)</legend>
          <EventCommandList
            commands={page.commands}
            onChange={(commands) => updatePage({ commands })}
            mode={mode}
            maps={mapsInProject}
            project={project}
          />
        </fieldset>
      </section>
    </div>
  );
}

interface ConditionsEditorProps {
  conditions: EventCondition[];
  project: Project;
  onChange: (next: EventCondition[]) => void;
}

function ConditionsEditor({ conditions, project, onChange }: ConditionsEditorProps) {
  const add = (): void => {
    const firstSwitchId = Object.keys(project.switches ?? {})[0] ?? '';
    onChange([...conditions, { type: 'switch', id: firstSwitchId, value: true }]);
  };

  const update = (index: number, next: EventCondition): void => {
    onChange(conditions.map((c, i) => (i === index ? next : c)));
  };

  const remove = (index: number): void => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <fieldset className="event-section">
      <legend>Active seulement si…</legend>
      {conditions.length === 0 && (
        <p className="muted">Aucune condition — variante toujours active.</p>
      )}
      {conditions.map((c, i) => (
        <div key={i} className="event-condition-row">
          <ConditionPicker
            condition={c}
            project={project}
            onChange={(next) => update(i, next)}
          />
          <button type="button" className="danger" onClick={() => remove(i)} title="Retirer">
            ×
          </button>
        </div>
      ))}
      <div className="event-conditions-add">
        <button type="button" onClick={add}>
          + Ajouter une condition
        </button>
      </div>
    </fieldset>
  );
}
