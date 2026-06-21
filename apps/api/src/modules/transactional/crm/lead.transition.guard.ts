import { type LeadStatus, lead_statuses } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const lead_status_transition_matrix = {
  new: ["in_processing", "cancelled"],
  in_processing: [],
  cancelled: []
} as const satisfies Record<LeadStatus, readonly LeadStatus[]>;

export const lead_status_transition_guard: StatusTransitionGuard<LeadStatus> =
  create_status_transition_guard("crm.lead", lead_status_transition_matrix);

export function assert_lead_status_transition(from: LeadStatus, to: LeadStatus): void {
  lead_status_transition_guard.assertTransition(from, to);
}

export const lead_transition_contract_todo = {
  adminOverrideFlow: "TODO",
  allowedStatuses: lead_statuses
} as const;
