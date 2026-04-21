# Specs

Spécifications techniques détaillées des formats et contrats de SRB.

## À produire (par phase)

| Doc                   | Phase | Contenu                                       |
| --------------------- | ----- | --------------------------------------------- |
| `project-format.md`   | P1-P3 | Structure JSON d'un projet SRB complet        |
| `map-format.md`       | P1-P2 | Layers, tiles, collisions, events             |
| `event-commands.md`   | P3    | Liste des commandes d'events (type + params)  |
| `database-schemas.md` | P4    | Acteurs, classes, items, skills, ennemis      |
| `battle-formulas.md`  | P4    | Formules de dégâts, XP, level up              |
| `api.md`              | P5    | Contrats API REST (endpoints, payloads)       |
| `websocket-events.md` | P7    | Events Socket.io client ↔ serveur             |
| `scripting-api.md`    | P8    | API exposée au code utilisateur (mode expert) |

Chaque spec doit être **versionnée** (ex: `project-format` v1.0.0 → v1.1.0 si breaking change).
