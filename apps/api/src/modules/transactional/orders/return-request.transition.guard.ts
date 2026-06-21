import type { ReturnRequestStatus } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const return_request_status_transition_matrix = {
  created: ["confirmed"],
  confirmed: ["processed"],
  processed: ["closed"],
  closed: []
} as const satisfies Record<ReturnRequestStatus, readonly ReturnRequestStatus[]>;

export const return_request_status_transition_guard: StatusTransitionGuard<ReturnRequestStatus> =
  create_status_transition_guard("orders.return_request", return_request_status_transition_matrix);

export function assert_return_request_status_transition(
  from: ReturnRequestStatus,
  to: ReturnRequestStatus
): void {
  return_request_status_transition_guard.assertTransition(from, to);
}

export const return_request_transition_contract_todo = {
  quarantineReleasePolicy: "TODO",
  refundCoordinationPolicy: "TODO"
} as const;
