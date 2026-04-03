export interface TransitionDecision {
  allowed: boolean;
  reason?: string;
}

export interface StatusTransitionGuard<TStatus extends string> {
  entityName: string;
  canTransition(from: TStatus, to: TStatus): TransitionDecision;
  assertTransition(from: TStatus, to: TStatus): void;
}

export class StatusTransitionError extends Error {
  constructor(
    readonly entityName: string,
    readonly from: string,
    readonly to: string,
    readonly reason?: string
  ) {
    super(
      reason
        ? `${entityName} transition '${from}' -> '${to}' is not allowed: ${reason}`
        : `${entityName} transition '${from}' -> '${to}' is not allowed`
    );
    this.name = "StatusTransitionError";
  }
}

export function create_status_transition_guard<TStatus extends string>(
  entityName: string,
  allowedTransitions: Record<TStatus, readonly TStatus[]>
): StatusTransitionGuard<TStatus> {
  return {
    entityName,
    canTransition(from: TStatus, to: TStatus): TransitionDecision {
      if (from === to) {
        return { allowed: true };
      }

      const fromTransitions = allowedTransitions[from];
      if (fromTransitions.includes(to)) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: "transition is not present in the accepted transition matrix"
      };
    },
    assertTransition(from: TStatus, to: TStatus): void {
      const decision = this.canTransition(from, to);
      if (!decision.allowed) {
        throw new StatusTransitionError(entityName, from, to, decision.reason);
      }
    }
  };
}
