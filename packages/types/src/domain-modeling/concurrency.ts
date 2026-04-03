export const optimistic_concurrency_rules = {
  versionField: "version",
  createInitialVersion: 1,
  updateIncrementsBy: 1,
  conflictBehavior: "reject_with_conflict_error",
  appliesTo: "mutable_domain_aggregates_when_introduced"
} as const;

export interface VersionedEntityContract {
  id: string;
  version: number;
}

export function next_entity_version(current_version: number): number {
  return current_version + optimistic_concurrency_rules.updateIncrementsBy;
}

export const concurrency_deferred_todos = {
  perEntityConcurrencyPolicy: "TODO",
  retryPolicyOnVersionConflict: "TODO"
} as const;

