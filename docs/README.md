# Documentation SRB

## Plan par dossier

| Dossier | Contenu |
|---|---|
| `architecture/` | Vues d'ensemble, flux de données, décisions d'archi (ADRs) |
| `specs/` | Spécifications techniques des formats (project, map, events, API) |
| `claude-code/` | Conventions, templates de tâches, review checklist pour Claude |
| `user-guide/` | Guide utilisateur final (créateurs et joueurs) |

## Principes

- **Docs-as-code** : la doc vit dans le repo, évolue avec le code
- Chaque décision d'architecture majeure → un fichier ADR dans `architecture/decisions/`
- Chaque format de donnée du jeu → une spec versionnée dans `specs/`
