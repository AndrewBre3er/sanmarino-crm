export const soft_delete_applicability_matrix = {
  required: ["crm.deal", "orders.order", "payments.payment", "orders.return_request"],
  optional: ["audit.audit_log_record", "system.idempotency_record", "system.outbox_record"],
  deferred: [
    // TODO: extend matrix for additional entities when business schema is introduced.
  ]
} as const;

export function requires_soft_delete(entity_path: string): boolean {
  return (soft_delete_applicability_matrix.required as readonly string[]).includes(entity_path);
}

export function supports_soft_delete(entity_path: string): boolean {
  return (
    requires_soft_delete(entity_path) ||
    (soft_delete_applicability_matrix.optional as readonly string[]).includes(entity_path)
  );
}

export const soft_delete_rules = {
  requiredEntitiesCannotUsePhysicalDelete: true,
  deleteMarkers: ["deleted_at", "deleted_by", "delete_reason", "is_deleted"],
  auditVisibilityMustRemain: true,
  reconciliationVisibilityMustRemain: true
} as const;

