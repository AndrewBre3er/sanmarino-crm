import { type OrderControlOverlayStatus } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const order_control_overlay_transition_matrix = {
  none: ["on_control"],
  on_control: ["none", "problem"],
  problem: ["none"]
} as const satisfies Record<OrderControlOverlayStatus, readonly OrderControlOverlayStatus[]>;

export const order_control_overlay_transition_guard: StatusTransitionGuard<OrderControlOverlayStatus> =
  create_status_transition_guard("orders.order_payment_control_status", order_control_overlay_transition_matrix);

export function assert_order_control_overlay_transition(
  from: OrderControlOverlayStatus,
  to: OrderControlOverlayStatus
): void {
  order_control_overlay_transition_guard.assertTransition(from, to);
}
