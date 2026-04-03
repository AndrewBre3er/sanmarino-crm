# 35. v9 Update Summary

## Added in v9

- `32-physical-database-schema.md`
- `33-root-repo-files-spec.md`
- `34-bootstrap-task-for-codex.md`

## Purpose

v9 moves the project from logical architecture to implementation bootstrap.
It fixes:
- the physical PostgreSQL/Prisma schema surface
- the exact root repo file contract
- the immediate Codex bootstrap task for repository generation

## Result

This package can now be used as the source-of-truth context for:
- database bootstrap
- monorepo bootstrap
- first Codex repository generation pass
