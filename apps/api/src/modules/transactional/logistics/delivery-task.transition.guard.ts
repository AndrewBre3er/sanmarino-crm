import type { DeliveryTaskStatus } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const delivery_task_status_transition_matrix = {
  planned: ["assigned", "rescheduled", "failed"],
  assigned: ["in_transit", "rescheduled", "failed"],
  in_transit: ["delivered", "failed"],
  rescheduled: [],
  delivered: [],
  failed: []
} as const satisfies Record<DeliveryTaskStatus, readonly DeliveryTaskStatus[]>;

export const delivery_task_status_transition_guard: StatusTransitionGuard<DeliveryTaskStatus> =
  create_status_transition_guard("logistics.delivery_task", delivery_task_status_transition_matrix);

export function assert_delivery_task_status_transition(
  from: DeliveryTaskStatus,
  to: DeliveryTaskStatus
): void {
  delivery_task_status_transition_guard.assertTransition(from, to);
}

export const delivery_task_transition_contract_todo = {
  redeliveryPolicy: "TODO",
  routeReassignmentPolicy: "TODO"
} as const;
