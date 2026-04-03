import { type DealStatus, deal_statuses } from "../shared/status.contract";
import {
  create_status_transition_guard,
  type StatusTransitionGuard
} from "../shared/transition.guard";

export const deal_status_transition_matrix = {
  draft: ["qualified", "lost"],
  qualified: ["proposal", "lost"],
  proposal: ["negotiation", "lost"],
  negotiation: ["proposal", "won", "lost"],
  won: [],
  lost: []
} as const satisfies Record<DealStatus, readonly DealStatus[]>;

export const deal_status_transition_guard: StatusTransitionGuard<DealStatus> =
  create_status_transition_guard("crm.deal", deal_status_transition_matrix);

export function assert_deal_status_transition(from: DealStatus, to: DealStatus): void {
  deal_status_transition_guard.assertTransition(from, to);
}

export const deal_transition_contract_todo = {
  adminOverrideFlow: "TODO",
  reopenedDealPolicy: "TODO",
  sourceSpecificTransitionPolicy: "TODO",
  allowedStatuses: deal_statuses
} as const;
