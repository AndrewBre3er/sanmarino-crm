import { describe, expect, it } from "vitest";
import {
  crm_core_entities,
  crm_core_read_side_contract,
  crm_core_status_contract
} from "../../src/contracts/crm-core.contract";
import {
  deal_statuses,
  lead_statuses
} from "../../src/modules/transactional/shared/status.contract";

describe("crm core contract freeze", () => {
  it("keeps CRM entity scope fixed for Step 1", () => {
    expect(crm_core_entities).toEqual([
      "lead",
      "deal",
      "client",
      "contact",
      "client_participant",
      "deal_follow_up",
      "deal_communication",
      "client_merge_case"
    ]);
  });

  it("keeps CRM status contracts aligned between API and transactional layer", () => {
    expect(crm_core_status_contract.lead).toEqual(lead_statuses);
    expect(crm_core_status_contract.deal).toEqual(deal_statuses);
  });

  it("marks read-side resources as implemented vs deferred for CRM productivity baseline", () => {
    expect(crm_core_read_side_contract.freezePhase).toBe(
      "delta0-crm-productivity-baseline"
    );
    expect(crm_core_read_side_contract.implementedCollections).toEqual([
      "leads",
      "deals",
      "clients",
      "contacts",
      "client-participants",
      "deal-follow-ups",
      "deal-communications",
      "client-dedup-candidates"
    ]);
    expect(crm_core_read_side_contract.deferredCollections).toEqual([]);
  });
});
