# 27. Project Bootstrap Checklist


## Before opening the repo in VS Code

Проверить:
- Git установлен
- Git Bash работает
- VS Code установлен
- SSH настроен для Git и VPS
- локальная машина не использует production secrets
- архив контекста распакован в корень репозитория

## Before asking Codex to write code

Подтвердить:
- прочитан `README.md`
- прочитан `AGENTS.md`
- прочитан каталог `docs/`
- утверждён tech baseline
- утверждён MVP v1
- определён текущий task file
- понятен первый безопасный шаг реализации

## Before first commit

Проверить:
- `.gitignore` актуален
- `.env.example` содержит только placeholders
- нет реальных `.env`
- нет случайных бинарников
- нет секретов в markdown-файлах
- структура каталогов не противоречит docs

## Before first deploy

Проверить:
- есть baseline security
- есть testing strategy
- есть release checklist
- определён VPS deployment path
- определён rollback approach
- backup process понятен

- подтверждено чтение `08-architecture-fixes-and-critical-blockers.md`
