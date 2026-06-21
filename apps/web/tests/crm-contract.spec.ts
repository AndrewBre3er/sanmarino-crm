import { describe, expect, it } from "vitest";
import {
  parse_crm_deal_collection_payload,
  parse_crm_deal_detail_payload,
  parse_crm_lead_collection_payload,
  parse_crm_lead_detail_payload
} from "../src/lib/crm/crm-contract";

describe("crm contract payload parsers", () => {
  it("parses lead collection payload from backend read-side response", () => {
    const parsed = parse_crm_lead_collection_payload({
      data: [
        {
          id: "lead_1",
          source: "site",
          status: "new",
          clientId: null,
          contactId: null,
          title: "Kitchen lead",
          notes: null,
          responsibleUserId: "user_1",
          createdAt: "2026-04-09T10:00:00.000Z",
          updatedAt: "2026-04-09T11:00:00.000Z",
          version: 1
        }
      ],
      meta: {
        pagination: {
          mode: "page",
          page: {
            page: 1,
            pageSize: 20,
            totalItems: 1,
            totalPages: 1
          }
        }
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.data).toHaveLength(1);
    expect(parsed?.data[0]?.status).toBe("new");
    expect(parsed?.pagination?.totalItems).toBe(1);
  });

  it("rejects malformed lead payload", () => {
    const parsed = parse_crm_lead_collection_payload({
      data: [{ id: "lead_1" }]
    });

    expect(parsed).toBeNull();
  });

  it("parses lead detail payload", () => {
    const parsed = parse_crm_lead_detail_payload({
      data: {
        id: "lead_2",
        source: "avito",
        status: "in_processing",
        clientId: "client_1",
        contactId: "contact_1",
        title: "Bathroom lead",
        notes: "call tomorrow",
        responsibleUserId: "user_2",
        createdAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T11:00:00.000Z",
        version: 2
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe("in_processing");
    expect(parsed?.clientId).toBe("client_1");
  });

  it("parses deal collection payload from backend read-side response", () => {
    const parsed = parse_crm_deal_collection_payload({
      data: [
        {
          id: "deal_1",
          leadId: "lead_1",
          clientId: "client_1",
          contactId: "contact_1",
          status: "in_progress",
          title: "Kitchen project",
          notes: null,
          responsibleUserId: "user_1",
          nextContactAt: "2026-04-12T10:00:00.000Z",
          lostReason: null,
          isStuck: true,
          stuckReason: "waiting_supplier_eta",
          createdAt: "2026-04-09T10:00:00.000Z",
          updatedAt: "2026-04-09T11:00:00.000Z",
          version: 1,
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          isDeleted: false
        }
      ],
      meta: {
        pagination: {
          mode: "page",
          page: {
            page: 1,
            pageSize: 20,
            totalItems: 1,
            totalPages: 1
          }
        }
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.data).toHaveLength(1);
    expect(parsed?.data[0]?.status).toBe("in_progress");
    expect(parsed?.data[0]?.nextContactAt).toBe("2026-04-12T10:00:00.000Z");
    expect(parsed?.data[0]?.isStuck).toBe(true);
    expect(parsed?.data[0]?.stuckReason).toBe("waiting_supplier_eta");
    expect(parsed?.pagination?.pageSize).toBe(20);
  });

  it("parses deal detail payload", () => {
    const parsed = parse_crm_deal_detail_payload({
      data: {
        id: "deal_2",
        leadId: "lead_2",
        clientId: "client_2",
        contactId: null,
        status: "converted_to_order",
        title: "Converted deal",
        notes: "order created",
        responsibleUserId: "user_3",
        nextContactAt: null,
        lostReason: "price_not_accepted",
        isStuck: false,
        stuckReason: null,
        createdAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T11:00:00.000Z",
        version: 3,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        isDeleted: false
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe("converted_to_order");
    expect(parsed?.title).toBe("Converted deal");
    expect(parsed?.lostReason).toBe("price_not_accepted");
  });

  it("rejects malformed deal payload", () => {
    const parsed = parse_crm_deal_collection_payload({
      data: [{ id: "deal_1", status: "in_progress" }]
    });

    expect(parsed).toBeNull();
  });
});
