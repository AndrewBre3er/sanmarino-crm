# `.beads/` Workflow Metadata Status

## Purpose

Формально зафиксировать статус каталога `.beads/` в репозитории, чтобы он не воспринимался как случайный мусор и одновременно не подменял канонические `docs/*`.

## Decision

Каталог `.beads/` разрешён в корне репозитория как repo-local слой:
- task tracking
- execution planning
- branch-aware workflow metadata

## Non-goals

`.beads/` не является:
- источником истины для бизнес-логики
- источником архитектурных решений
- источником API contracts
- заменой accepted docs в `docs/*`

## Authority Rules

При конфликте приоритет всегда такой:
1. `AGENTS.md`
2. accepted docs в `docs/*`
3. `.beads/`

`.beads/` может хранить задачи, зависимости и execution metadata, но не может переопределять продуктовые решения.

## Repository Impact

Нужно явно отразить этот статус в:
- `AGENTS.md`
- `docs/30-initial-folder-contracts.md`
- `docs/33-root-repo-files-spec.md`

## Why Now

Проект вышел из bootstrap-фазы и перешёл к многослойной доменной реализации. На этом этапе repo-local task tracking уже полезен, но его роль должна быть ограничена и явно описана.
