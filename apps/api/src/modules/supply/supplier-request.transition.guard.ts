import type { SupplierRequestStatus } from "../transactional/shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../transactional/shared/transition.guard";

export const supplier_request_status_transition_matrix = {
  formed: ["confirmed_by_supplier"],
  confirmed_by_supplier: ["paid"],
  paid: ["stocked"],
  stocked: []
} as const satisfies Record<SupplierRequestStatus, readonly SupplierRequestStatus[]>;

export const supplier_request_status_transition_guard: StatusTransitionGuard<SupplierRequestStatus> =
  create_status_transition_guard(
    "inventory.supplier_request",
    supplier_request_status_transition_matrix
  );

export function assert_supplier_request_status_transition(
  from: SupplierRequestStatus,
  to: SupplierRequestStatus
): void {
  supplier_request_status_transition_guard.assertTransition(from, to);
}
