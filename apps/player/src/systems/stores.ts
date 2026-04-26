import type { EventCondition, Project } from '@srb/types';

/**
 * Project-scoped boolean. Reading an unset switch returns false.
 */
export class SwitchStore {
  private values = new Map<string, boolean>();
  get(id: string): boolean {
    return this.values.get(id) ?? false;
  }
  set(id: string, value: boolean): void {
    this.values.set(id, value);
  }
  toggle(id: string): void {
    this.values.set(id, !this.get(id));
  }
}

/**
 * Project-scoped integer. Reading an unset variable returns 0.
 */
export class VariableStore {
  private values = new Map<string, number>();
  get(id: string): number {
    return this.values.get(id) ?? 0;
  }
  set(id: string, value: number): void {
    this.values.set(id, value);
  }
  /** Apply the project's initial values. Called once per session. */
  hydrate(initials: Record<string, number>): void {
    for (const [id, value] of Object.entries(initials)) {
      if (!this.values.has(id)) this.values.set(id, value);
    }
  }
}

/**
 * Self-switches are local to one map event, addressed by A/B/C/D.
 * Key format: `${mapId}:${eventId}:${slot}` so they survive transfers.
 */
export class SelfSwitchStore {
  private values = new Map<string, boolean>();
  private key(mapId: string, eventId: string, slot: 'A' | 'B' | 'C' | 'D'): string {
    return `${mapId}:${eventId}:${slot}`;
  }
  get(mapId: string, eventId: string, slot: 'A' | 'B' | 'C' | 'D'): boolean {
    return this.values.get(this.key(mapId, eventId, slot)) ?? false;
  }
  set(mapId: string, eventId: string, slot: 'A' | 'B' | 'C' | 'D', value: boolean): void {
    this.values.set(this.key(mapId, eventId, slot), value);
  }
}

export interface RuntimeStores {
  switches: SwitchStore;
  variables: VariableStore;
  selfSwitches: SelfSwitchStore;
}

const REGISTRY_KEY = 'srb:runtime-stores';

interface RegistryHost {
  registry: { get(key: string): unknown; set(key: string, value: unknown): void };
}

/**
 * Returns the per-game stores, creating them on first access. Stored on the
 * Phaser registry so they persist across scene.restart() (used by transfer).
 */
export function getRuntimeStores(host: RegistryHost): RuntimeStores {
  const existing = host.registry.get(REGISTRY_KEY) as RuntimeStores | undefined;
  if (existing) return existing;
  const stores: RuntimeStores = {
    switches: new SwitchStore(),
    variables: new VariableStore(),
    selfSwitches: new SelfSwitchStore(),
  };
  host.registry.set(REGISTRY_KEY, stores);
  return stores;
}

/** Drops the runtime stores. Used when the player exits the game session. */
export function resetRuntimeStores(host: RegistryHost): void {
  host.registry.set(REGISTRY_KEY, undefined);
}

/** Hydrates the variable store with the project's initial values. */
export function hydrateFromProject(stores: RuntimeStores, project: Project | null): void {
  if (!project?.variables) return;
  const initials: Record<string, number> = {};
  for (const [id, def] of Object.entries(project.variables)) {
    if (def.initial !== undefined) initials[id] = def.initial;
  }
  stores.variables.hydrate(initials);
}

/**
 * Evaluates an EventCondition against the runtime stores. `item_owned` is a
 * no-op until the inventory system lands in Phase 4 — it returns true so an
 * event configured with that condition is not silently disabled. The editor
 * surfaces a warning instead.
 */
export function evaluateCondition(
  cond: EventCondition,
  stores: RuntimeStores,
  ctx: { mapId: string; eventId: string },
): boolean {
  switch (cond.type) {
    case 'switch':
      return stores.switches.get(cond.id) === cond.value;
    case 'self_switch':
      return stores.selfSwitches.get(ctx.mapId, ctx.eventId, cond.id) === cond.value;
    case 'variable': {
      const v = stores.variables.get(cond.id);
      switch (cond.op) {
        case '=':
          return v === cond.value;
        case '>=':
          return v >= cond.value;
        case '<=':
          return v <= cond.value;
        case '>':
          return v > cond.value;
        case '<':
          return v < cond.value;
      }
      return false;
    }
    case 'item_owned':
      return true;
  }
}
