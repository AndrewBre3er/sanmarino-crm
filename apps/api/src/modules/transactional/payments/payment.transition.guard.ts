import type { PaymentStatus } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const payment_status_transition_matrix = {
  pending: ["completed"],
  completed: ["refunded"],
  refunded: []
} as const satisfies Record<PaymentStatus, readonly PaymentStatus[]>;

export const payment_status_transition_guard: StatusTransitionGuard<PaymentStatus> =
  create_status_transition_guard("payments.payment", payment_status_transition_matrix);

export function assert_payment_status_transition(from: PaymentStatus, to: PaymentStatus): void {
  payment_status_transition_guard.assertTransition(from, to);
}

export const payment_transition_contract_todo = {
  partialRefundLifecyclePolicy: "TODO",
  voidPaymentPolicy: "TODO"
} as const;
