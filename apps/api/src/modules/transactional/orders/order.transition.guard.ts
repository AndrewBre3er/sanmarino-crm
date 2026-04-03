import { type OrderStatus } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const order_status_transition_matrix = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["reserved", "in_progress", "cancelled"],
  reserved: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["partial_return", "full_return", "closed"],
  partial_return: ["full_return", "closed"],
  full_return: ["closed"],
  closed: [],
  cancelled: []
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

export const order_status_transition_guard: StatusTransitionGuard<OrderStatus> =
  create_status_transition_guard("orders.order", order_status_transition_matrix);

export function assert_order_status_transition(from: OrderStatus, to: OrderStatus): void {
  order_status_transition_guard.assertTransition(from, to);
}

export function is_entering_delivery_flow_status(status: OrderStatus): boolean {
  return status === "in_progress" || status === "completed";
}

export const order_transition_contract_todo = {
  adminOverrideFlow: "TODO",
  postCloseCorrectionPolicy: "TODO",
  partialReturnOperationalPolicy: "TODO"
} as const;
