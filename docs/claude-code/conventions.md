# Conventions pour Claude Code

> Complément du `CLAUDE.md` racine. À lire avant toute tâche non-triviale.

## Commits

Format Conventional Commits : `type(scope): description`

- `feat` — nouvelle fonctionnalité
- `fix` — correction de bug
- `chore` — maintenance, config, outillage
- `docs` — documentation uniquement
- `refactor` — refonte sans changement de comportement
- `test` — ajout/modif de tests
- `perf` — amélioration de performance

Scope optionnel : nom du package/app impacté (`feat(editor):`, `fix(api):`).

## Branches

- `main` — branche stable, toujours déployable
- `feat/<nom-court>` — nouvelles fonctionnalités
- `fix/<nom-court>` — corrections
- `chore/<nom-court>` — setup/outillage

## PR

- Titre = message de commit principal
- Description : contexte, ce qui change, comment tester
- Auto-review avant merge

## Tests

- Logique pure → Vitest dans `<package>/src/**/*.test.ts`
- Flows critiques → Playwright dans `e2e/`
- Ne pas mocker la DB dans les tests d'intégration — utiliser une vraie instance
