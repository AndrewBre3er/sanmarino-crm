import type { ApiBoundaryAuditContext } from "../../../common/audit/audit-context.contract";
import type {
  AuditLogPersistenceRepositoryContract,
  IdempotencyPersistenceRepositoryContract,
  OutboxPersistenceRepositoryContract,
  PersistenceWriteMetadata,
  RepositoryUpdateOptions,
  TransactionBoundaryContract,
  TransactionBoundaryOptions,
  TransactionContext
} from "../../../common/persistence";
import type { ApiShellRequestContext } from "../../../common/request-context/request-context.types";

export interface UseCaseExecutionContext {
  requestContext?: ApiShellRequestContext;
  auditContext?: ApiBoundaryAuditContext;
  idempotencyKey?: string;
  transactionOptions?: TransactionBoundaryOptions;
}

export interface TransactionalUseCaseBaseDependencies {
  transactionBoundary: TransactionBoundaryContract;
}

export interface UseCaseSideEffectDependencies {
  idempotencyRepository?: IdempotencyPersistenceRepositoryContract;
  outboxRepository?: OutboxPersistenceRepositoryContract;
  auditLogRepository?: AuditLogPersistenceRepositoryContract;
}

export interface TransactionBindableRepository<TRepository> {
  withTransaction(context: TransactionContext): TRepository;
}

function is_transaction_bindable_repository<TRepository>(
  repository: TRepository
): repository is TRepository & TransactionBindableRepository<TRepository> {
  return (
    typeof repository === "object" &&
    repository !== null &&
    "withTransaction" in repository &&
    typeof (repository as { withTransaction?: unknown }).withTransaction === "function"
  );
}

export function bind_repository_to_transaction<TRepository>(
  repository: TRepository,
  context: TransactionContext
): TRepository {
  if (is_transaction_bindable_repository(repository)) {
    return repository.withTransaction(context);
  }

  return repository;
}

export function to_persistence_write_metadata(
  executionContext: UseCaseExecutionContext = {}
): PersistenceWriteMetadata | undefined {
  const actorId =
    executionContext.auditContext?.actor.userId ??
    executionContext.auditContext?.actor.actorId ??
    executionContext.requestContext?.actor.userId ??
    executionContext.requestContext?.actor.actorId;

  const metadata: PersistenceWriteMetadata = {
    ...(actorId ? { actorId } : {}),
    ...(executionContext.requestContext?.requestId
      ? { requestId: executionContext.requestContext.requestId }
      : {}),
    ...(executionContext.requestContext?.correlationId
      ? { correlationId: executionContext.requestContext.correlationId }
      : {})
  };

  if (Object.keys(metadata).length === 0) {
    return undefined;
  }

  return metadata;
}

export function to_repository_update_options(
  executionContext: UseCaseExecutionContext = {}
): RepositoryUpdateOptions | undefined {
  const metadata = to_persistence_write_metadata(executionContext);
  if (!metadata) {
    return undefined;
  }

  return { metadata };
}

export function mark_side_effect_contracts_as_todo(
  dependencies: UseCaseSideEffectDependencies | undefined
): void {
  void dependencies;
  // TODO: wire idempotency/outbox/audit repositories to concrete domain side effects.
}
