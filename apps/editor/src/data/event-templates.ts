import type { EventCommand, EventPage, MapEvent } from '@srb/types';
import { genId } from './blank-map';
import { createBlankEventPage } from './events';

export type EventTemplateId = 'empty' | 'npc' | 'sign' | 'teleport' | 'door';

export interface EventTemplate {
  id: EventTemplateId;
  label: string;
  description: string;
  icon: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'npc',
    label: 'PNJ qui parle',
    description: 'Un personnage immobile. Le joueur appuie sur action pour lui parler.',
    icon: '🧙',
  },
  {
    id: 'sign',
    label: 'Panneau d’info',
    description: 'Un panneau invisible ou visible qui affiche un texte quand on interagit.',
    icon: '📜',
  },
  {
    id: 'teleport',
    label: 'Téléporteur',
    description: 'Invisible. Quand le joueur marche dessus, il est envoyé sur une autre map.',
    icon: '🌀',
  },
  {
    id: 'door',
    label: 'Porte / passage',
    description: 'Le joueur appuie sur action pour changer de map (comme une porte d’entrée).',
    icon: '🚪',
  },
  {
    id: 'empty',
    label: 'Vide (à configurer)',
    description: 'Event sans défaut. À toi de construire ses pages.',
    icon: '⬜',
  },
];

export function createEventFromTemplate(
  template: EventTemplateId,
  x: number,
  y: number,
): MapEvent {
  const id = genId('event');
  switch (template) {
    case 'npc':
      return {
        id,
        name: `PNJ ${x},${y}`,
        x,
        y,
        pages: [npcPage()],
      };
    case 'sign':
      return {
        id,
        name: `Panneau ${x},${y}`,
        x,
        y,
        pages: [signPage()],
      };
    case 'teleport':
      return {
        id,
        name: `Téléporteur ${x},${y}`,
        x,
        y,
        pages: [teleportPage()],
      };
    case 'door':
      return {
        id,
        name: `Porte ${x},${y}`,
        x,
        y,
        pages: [doorPage()],
      };
    case 'empty':
    default:
      return {
        id,
        name: `Event ${x},${y}`,
        x,
        y,
        pages: [createBlankEventPage()],
      };
  }
}

function npcPage(): EventPage {
  const commands: EventCommand[] = [
    { type: 'show_text', speaker: 'Villageois', text: 'Bonjour, voyageur !' },
  ];
  return {
    conditions: [],
    trigger: 'action',
    graphic: { spriteId: 'villager', direction: 'down', frame: 0 },
    movement: { type: 'fixed' },
    commands,
  };
}

function signPage(): EventPage {
  const commands: EventCommand[] = [{ type: 'show_text', text: 'Bienvenue dans ce lieu !' }];
  return {
    conditions: [],
    trigger: 'action',
    graphic: { spriteId: null, direction: 'down', frame: 0 },
    movement: { type: 'fixed' },
    commands,
  };
}

function teleportPage(): EventPage {
  const commands: EventCommand[] = [{ type: 'transfer', mapId: '', x: 0, y: 0 }];
  return {
    conditions: [],
    trigger: 'contact',
    graphic: { spriteId: null, direction: 'down', frame: 0 },
    movement: { type: 'fixed' },
    commands,
  };
}

function doorPage(): EventPage {
  const commands: EventCommand[] = [{ type: 'transfer', mapId: '', x: 0, y: 0 }];
  return {
    conditions: [],
    trigger: 'action',
    graphic: { spriteId: null, direction: 'down', frame: 0 },
    movement: { type: 'fixed' },
    commands,
  };
}
