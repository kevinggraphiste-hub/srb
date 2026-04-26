import { useEffect, useMemo, useState } from 'react';
import type { Project, ProjectSwitch, ProjectVariable } from '@srb/types';

interface ProjectRegistryDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onApply: (next: {
    switches: Record<string, ProjectSwitch>;
    variables: Record<string, ProjectVariable>;
  }) => void;
}

interface SwitchRow {
  id: string;
  label: string;
}

interface VariableRow {
  id: string;
  label: string;
  initial: number;
}

/**
 * Modal to declare project-wide switches and variables. Ids are arbitrary
 * strings (e.g. "has-key", "gold") and used as-is by event commands and
 * conditions — renaming an id here does not rewrite existing references.
 */
export function ProjectRegistryDialog({
  open,
  project,
  onClose,
  onApply,
}: ProjectRegistryDialogProps) {
  const initialSwitches = useMemo<SwitchRow[]>(
    () =>
      Object.entries(project.switches ?? {}).map(([id, def]) => ({ id, label: def.label })),
    [project.switches],
  );
  const initialVariables = useMemo<VariableRow[]>(
    () =>
      Object.entries(project.variables ?? {}).map(([id, def]) => ({
        id,
        label: def.label,
        initial: def.initial ?? 0,
      })),
    [project.variables],
  );

  const [switches, setSwitches] = useState<SwitchRow[]>(initialSwitches);
  const [variables, setVariables] = useState<VariableRow[]>(initialVariables);

  useEffect(() => {
    if (!open) return;
    setSwitches(initialSwitches);
    setVariables(initialVariables);
  }, [open, initialSwitches, initialVariables]);

  if (!open) return null;

  const switchIds = new Set(switches.map((s) => s.id));
  const variableIds = new Set(variables.map((v) => v.id));
  const switchDuplicates = switches.length !== switchIds.size;
  const variableDuplicates = variables.length !== variableIds.size;
  const switchEmptyId = switches.some((s) => !s.id.trim());
  const variableEmptyId = variables.some((v) => !v.id.trim());
  const invalid = switchDuplicates || variableDuplicates || switchEmptyId || variableEmptyId;

  const addSwitch = (): void => {
    const next: SwitchRow = { id: nextId('switch', switchIds), label: '' };
    setSwitches((prev) => [...prev, next]);
  };
  const addVariable = (): void => {
    const next: VariableRow = { id: nextId('var', variableIds), label: '', initial: 0 };
    setVariables((prev) => [...prev, next]);
  };

  const submit = (): void => {
    if (invalid) return;
    const sw: Record<string, ProjectSwitch> = {};
    for (const row of switches) sw[row.id.trim()] = { label: row.label };
    const va: Record<string, ProjectVariable> = {};
    for (const row of variables) {
      va[row.id.trim()] = row.initial === 0 ? { label: row.label } : { label: row.label, initial: row.initial };
    }
    onApply({ switches: sw, variables: va });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <h3>Switches & variables du projet</h3>
        <p className="modal-hint">
          Les switches sont des booléens (ON/OFF) et les variables des entiers, partagés par tous
          les events. L&apos;<code>id</code> est utilisé tel quel par les conditions et les
          commandes — renommer un id ici ne met pas à jour les usages existants.
        </p>

        <section className="registry-section">
          <header className="registry-section-header">
            <h4>Switches</h4>
            <button type="button" onClick={addSwitch}>
              + Ajouter un switch
            </button>
          </header>
          {switches.length === 0 && <p className="muted">Aucun switch déclaré.</p>}
          {switches.map((row, i) => (
            <div className="registry-row" key={i}>
              <input
                className="registry-id"
                placeholder="id (ex: has-key)"
                value={row.id}
                onChange={(e) =>
                  setSwitches((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, id: e.target.value } : r)),
                  )
                }
              />
              <input
                className="registry-label"
                placeholder="libellé (ex: Le joueur a la clé)"
                value={row.label}
                onChange={(e) =>
                  setSwitches((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)),
                  )
                }
              />
              <button
                type="button"
                className="danger"
                onClick={() => setSwitches((prev) => prev.filter((_, idx) => idx !== i))}
                title="Supprimer ce switch"
              >
                ×
              </button>
            </div>
          ))}
          {switchDuplicates && <p className="modal-error">Deux switches partagent le même id.</p>}
          {switchEmptyId && <p className="modal-error">Un switch a un id vide.</p>}
        </section>

        <section className="registry-section">
          <header className="registry-section-header">
            <h4>Variables</h4>
            <button type="button" onClick={addVariable}>
              + Ajouter une variable
            </button>
          </header>
          {variables.length === 0 && <p className="muted">Aucune variable déclarée.</p>}
          {variables.map((row, i) => (
            <div className="registry-row" key={i}>
              <input
                className="registry-id"
                placeholder="id (ex: gold)"
                value={row.id}
                onChange={(e) =>
                  setVariables((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, id: e.target.value } : r)),
                  )
                }
              />
              <input
                className="registry-label"
                placeholder="libellé (ex: Or possédé)"
                value={row.label}
                onChange={(e) =>
                  setVariables((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)),
                  )
                }
              />
              <input
                className="registry-initial"
                type="number"
                value={row.initial}
                title="Valeur initiale"
                onChange={(e) =>
                  setVariables((prev) =>
                    prev.map((r, idx) =>
                      idx === i ? { ...r, initial: Number(e.target.value) || 0 } : r,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="danger"
                onClick={() => setVariables((prev) => prev.filter((_, idx) => idx !== i))}
                title="Supprimer cette variable"
              >
                ×
              </button>
            </div>
          ))}
          {variableDuplicates && (
            <p className="modal-error">Deux variables partagent le même id.</p>
          )}
          {variableEmptyId && <p className="modal-error">Une variable a un id vide.</p>}
        </section>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary" onClick={submit} disabled={invalid}>
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

function nextId(prefix: string, used: Set<string>): string {
  for (let i = 1; i < 10_000; i++) {
    const candidate = `${prefix}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}-${Date.now()}`;
}
