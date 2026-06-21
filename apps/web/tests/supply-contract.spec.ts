import { describe, expect, it } from "vitest";
import {
  parse_supplier_request_collection_payload,
  parse_supplier_request_detail_payload,
  can_view_supplier_request_attachment_for_roles
} from "../src/lib/supply/supply-contract";

describe("supply contract payload parsers", () => {
  it("parses supplier request collection payload from backend read-side response", () => {
    const parsed = parse_supplier_request_collection_payload({
      data: [
        {
          id: "sr_1",
          supplierId: "supplier_1",
          businessSourceType: "deal",
          businessSourceId: "deal_1",
          status: "formed",
          expectedSupplyDate: "2026-04-10",
          requestedBy: "user_1",
          createdAt: "2026-04-09T10:00:00.000Z",
          updatedAt: "2026-04-09T11:00:00.000Z",
          supplier: {
            id: "supplier_1",
            name: "Acme Supply"
          },
          itemsCount: 2
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
    expect(parsed?.data[0]?.status).toBe("formed");
    expect(parsed?.data[0]?.supplier.name).toBe("Acme Supply");
    expect(parsed?.pagination?.totalItems).toBe(1);
  });

  it("parses supplier request detail payload with items", () => {
    const parsed = parse_supplier_request_detail_payload({
      data: {
        id: "sr_2",
        supplierId: "supplier_2",
        businessSourceType: "order",
        businessSourceId: "order_2",
        status: "paid",
        expectedSupplyDate: "2026-04-11",
        requestedBy: "user_2",
        confirmedBy: "user_2",
        paidBy: "user_finance",
        paidAt: "2026-04-10T12:00:00.000Z",
        stockedBy: null,
        stockedAt: null,
        supplierDocumentUrl: null,
        createdAt: "2026-04-10T09:00:00.000Z",
        updatedAt: "2026-04-10T12:00:00.000Z",
        supplier: {
          id: "supplier_2",
          name: "Best Supplier"
        },
        items: [
          {
            id: "sri_1",
            productId: "product_1",
            quantity: "5",
            unit: "шт",
            sourceLineRef: "deal-line-1",
            sourceLineContext: {
              sourceDocument: "deal",
              sourceLineNo: 1
            },
            createdAt: "2026-04-10T09:00:00.000Z",
            updatedAt: "2026-04-10T09:00:00.000Z"
          }
        ]
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe("paid");
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0]?.unit).toBe("шт");
  });

  it("rejects malformed supplier request collection payload", () => {
    const parsed = parse_supplier_request_collection_payload({
      data: [
        {
          id: "sr_1",
          status: "formed"
        }
      ]
    });

    expect(parsed).toBeNull();
  });

  it("rejects malformed supplier request detail payload", () => {
    const parsed = parse_supplier_request_detail_payload({
      data: {
        id: "sr_3",
        status: "unknown_status"
      }
    });

    expect(parsed).toBeNull();
  });

  it("resolves attachment visibility baseline by role set", () => {
    expect(can_view_supplier_request_attachment_for_roles(["warehouse"])).toBe(true);
    expect(can_view_supplier_request_attachment_for_roles(["finance"])).toBe(true);
    expect(can_view_supplier_request_attachment_for_roles(["ceo"])).toBe(true);
    expect(can_view_supplier_request_attachment_for_roles(["seller"])).toBe(false);
  });
});
