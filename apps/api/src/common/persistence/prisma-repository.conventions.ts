import {
  persistence_base_field_conventions,
  type PersistenceListQuery
} from "./persistence-base.contract";
import { soft_delete_persistence_conventions } from "./soft-delete.contract";

export const prisma_repository_conventions = {
  provider: "prisma",
  queryDefaults: {
    defaultLimit: 50,
    maxLimit: 200
  },
  softDelete: soft_delete_persistence_conventions,
  baseFields: persistence_base_field_conventions,
  transaction: {
    driver: "$transaction",
    defaultIsolationLevel: "read_committed",
    timeoutMs: 5000,
    maxWaitMs: 2000
  }
} as const;

export function normalize_persistence_limit(query: PersistenceListQuery = {}): number {
  const requested = query.limit ?? prisma_repository_conventions.queryDefaults.defaultLimit;
  const bounded = Math.max(1, requested);
  return Math.min(bounded, prisma_repository_conventions.queryDefaults.maxLimit);
}

export const prisma_repository_deferred_todos = {
  repositoryImplementations: "TODO",
  transactionClientTyping: "TODO",
  queryExtensions: "TODO"
} as const;

