# 10. Environment: Win11 + Git Bash + VS Code + Codex

## 1. Базовая рабочая среда

Проект ведётся в среде:
- Windows 11
- Git for Windows
- Git Bash
- VS Code
- Git-репозиторий
- Codex

---

## 2. Минимальные требования

Должны быть готовы:
- установлен Git for Windows
- Git добавлен в PATH
- доступен Git Bash
- установлен VS Code
- репозиторий клонирован локально
- проект открывается из VS Code
- у команды есть единый репозиторий

---

## 3. Рабочая структура проекта

Минимальная структура:
- `docs/`
- `apps/`
- `packages/`
- `tests/`
- `scripts/`
- `deploy/`

Приложения:
- `apps/web`
- `apps/api`
- `apps/worker`

Общие пакеты:
- `packages/ui`
- `packages/config`
- `packages/types`

---

## 4. Обязательные файлы контекста

В корне:
- `AGENTS.md`
- `README.md`

В docs:
- логика проекта
- карта доменов
- состояния
- процессы
- правила целостности
- роли и доступ
- KPI
- структура репозитория
- правила деплоя

---

## 5. Правило запуска работ

Перед началом кодинга:
1. читать `AGENTS.md`
2. читать весь каталог `docs/`
3. только после этого проектировать код

---

## 6. Принцип по стеку

Стек прикладного runtime фиксируется утверждённым baseline:
- `docs/23-tech-baseline-and-decision-log.md`
- `docs/28-approved-tech-stack.md`

Этот документ описывает только рабочую среду Win11 + Git Bash + VS Code + Codex.
