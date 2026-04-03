export const transaction_isolation_levels = [
  "read_uncommitted",
  "read_committed",
  "repeatable_read",
  "serializable"
] as const;

export type TransactionIsolationLevel = (typeof transaction_isolation_levels)[number];

export interface TransactionBoundaryOptions {
  isolationLevel?: TransactionIsolationLevel;
  timeoutMs?: number;
  maxWaitMs?: number;
}

export interface TransactionContext {
  provider: "prisma";
  client: unknown;
  // TODO: narrow transaction client typing after PrismaClient wiring in implementation phase.
}

export type TransactionCallback<TResult> = (context: TransactionContext) => Promise<TResult>;

export interface TransactionBoundaryContract {
  runInTransaction<TResult>(
    callback: TransactionCallback<TResult>,
    options?: TransactionBoundaryOptions
  ): Promise<TResult>;
}

export const transaction_boundary_deferred_todos = {
  prismaClientBinding: "TODO",
  distributedTransactionStrategy: "TODO",
  outboxAtomicityHooks: "TODO"
} as const;

