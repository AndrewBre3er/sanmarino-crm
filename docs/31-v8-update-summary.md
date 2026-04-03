# 31. v8 Update Summary

В пакет внесены архитектурные исправления из `08-architecture-fixes-and-critical-blockers.md`.

Ключевые изменения:
- введён приоритетный документ `08`
- обновлены базовые документы `01` - `07`
- пересобраны документы по БД, API, event model, KPI, security, testing, QA, MVP, development standards и current task
- добавлены требования по:
  - soft lock / pre-reserve
  - `Order -> DeliveryTask = 1:N`
  - aggregated `Order.deliveryStatus`
  - Saga / Transactional Outbox / rollback
  - quarantine для возвратов
  - soft delete для core сущностей
  - live KPI из агрегатов
  - разделению retail price и cost
