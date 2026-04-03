export class DeferredSkeletonError extends Error {
  constructor(readonly componentName: string, readonly operation: string, details?: string) {
    super(
      details
        ? `${componentName}.${operation} is deferred: ${details}`
        : `${componentName}.${operation} is deferred for the current phase`
    );
    this.name = "DeferredSkeletonError";
  }
}

export class EntityNotFoundError extends Error {
  constructor(readonly entityName: string, readonly entityId: string) {
    super(`${entityName} with id '${entityId}' was not found`);
    this.name = "EntityNotFoundError";
  }
}

export function throw_deferred_skeleton(componentName: string, operation: string): never {
  throw new DeferredSkeletonError(
    componentName,
    operation,
    "TODO: implementation is intentionally deferred to repository/use-case implementation phase"
  );
}
