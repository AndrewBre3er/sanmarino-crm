import { type OrderStatus } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const order_status_transition_matrix = {
  assembling: ["ready_for_partial_shipment", "ready_for_shipment"],
  ready_for_partial_shipment: ["ready_for_shipment", "partially_shipped"],
  ready_for_shipment: ["partially_shipped", "shipped"],
  partially_shipped: ["ready_for_shipment", "shipped"],
  shipped: []
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

export const order_status_transition_guard: StatusTransitionGuard<OrderStatus> =
  create_status_transition_guard("orders.order", order_status_transition_matrix);

export function assert_order_status_transition(from: OrderStatus, to: OrderStatus): void {
  order_status_transition_guard.assertTransition(from, to);
}

export function is_entering_delivery_flow_status(status: OrderStatus): boolean {
  return status === "partially_shipped" || status === "shipped";
}

export const order_transition_contract_todo = {
  adminOverrideFlow: "TODO",
  postShipmentCorrectionPolicy: "TODO",
  partialShipmentCorrectionPolicy: "TODO"
} as const;
