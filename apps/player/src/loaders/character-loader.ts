import type { CharacterSheet } from '@srb/types';

/**
 * Fetches a CharacterSheet JSON from /assets/characters.
 * Runtime validation (Zod) will move this into @srb/schemas in Phase 2.
 */
export async function loadCharacterSheet(sheetId: string): Promise<CharacterSheet> {
  const response = await fetch(`/assets/characters/${sheetId}.json`);
  if (!response.ok) {
    throw new Error(
      `Failed to load character "${sheetId}": ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as CharacterSheet;
}
