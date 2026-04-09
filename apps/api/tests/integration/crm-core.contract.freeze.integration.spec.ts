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
      "client_participant"
    ]);
  });

  it("keeps CRM status contracts aligned between API and transactional layer", () => {
    expect(crm_core_status_contract.lead).toEqual(lead_statuses);
    expect(crm_core_status_contract.deal).toEqual(deal_statuses);
  });

  it("marks read-side resources as implemented vs deferred for CRM Step 1", () => {
    expect(crm_core_read_side_contract.freezePhase).toBe("crm-step-1-contract-freeze");
    expect(crm_core_read_side_contract.implementedCollections).toEqual(["leads", "deals"]);
    expect(crm_core_read_side_contract.deferredCollections).toEqual([
      "clients",
      "contacts",
      "client-participants"
    ]);
  });
});

