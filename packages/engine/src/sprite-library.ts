/**
 * Placeholder sprite catalogue for Phase 3.
 *
 * Until the real asset manager arrives in Phase 5, every character sprite
 * reuses the single ash.png sheet with a different tint. The editor exposes
 * this catalogue as a visual picker so users stop typing sprite ids by hand.
 *
 * Decor objects (signs, doors, chests, teleporters) stay invisible in the
 * runtime (spriteId: null) for now — they are still marked in the editor
 * canvas by the Event tool's colored badges.
 */

export interface CharacterSpritePreset {
  /** Matches the filename under /assets/characters/<id>.json. */
  id: string;
  /** Human-friendly FR label shown in the editor. */
  label: string;
  /** Short description shown under the label in the picker. */
  hint: string;
  /** Tint as 0xRRGGBB, applied on top of ash.png at runtime. */
  tint: number;
}

export const CHARACTER_SPRITES: CharacterSpritePreset[] = [
  { id: 'villager', label: 'Villageois', hint: 'Civil, paisible', tint: 0x68a4af },
  { id: 'villager-blue', label: 'Villageois bleu', hint: 'Tunique bleue', tint: 0x4d8dff },
  { id: 'villager-red', label: 'Villageois rouge', hint: 'Tunique rouge', tint: 0xe74c3c },
  { id: 'villager-green', label: 'Villageois vert', hint: 'Tunique verte', tint: 0x2ecc71 },
  { id: 'merchant', label: 'Marchand', hint: 'Robe orange', tint: 0xff9f43 },
  { id: 'guard', label: 'Garde', hint: 'Armure grise', tint: 0x95a5a6 },
  { id: 'mage', label: 'Mage', hint: 'Robe violette', tint: 0x9b59b6 },
  { id: 'knight', label: 'Chevalier', hint: 'Armure bleue', tint: 0x3498db },
  { id: 'king', label: 'Roi / Noble', hint: 'Vêtements dorés', tint: 0xf39c12 },
  { id: 'child', label: 'Enfant', hint: 'Tunique rose', tint: 0xe056fd },
];

export function getCharacterSpritePreset(id: string): CharacterSpritePreset | null {
  return CHARACTER_SPRITES.find((s) => s.id === id) ?? null;
}
