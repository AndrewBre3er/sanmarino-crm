import { describe, expect, it } from "vitest";
import {
  filter_fulfillments_by_order,
  parse_fulfillment_collection_payload,
  parse_order_collection_payload,
  parse_order_detail_payload
} from "../src/lib/orders/orders-contract";

describe("orders contract payload parsers", () => {
  it("parses order collection payload from backend read-side response", () => {
    const parsed = parse_order_collection_payload({
      data: [
        {
          id: "order_1",
          orderNumber: "ORD-1",
          dealId: "deal_1",
          clientId: "client_1",
          status: "assembling",
          paymentControlStatus: "none",
          paymentControlDueAt: null,
          fulfillmentType: "delivery",
          deliveryStatus: "not_scheduled",
          currency: "RUB",
          subtotalAmount: "1200.00",
          discountAmount: "100.00",
          totalAmount: "1100.00",
          notes: null,
          readyForPartialShipmentAt: null,
          readyForShipmentAt: null,
          partiallyShippedAt: null,
          shippedAt: null,
          createdAt: "2026-04-10T10:00:00.000Z",
          updatedAt: "2026-04-10T11:00:00.000Z",
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
    expect(parsed?.data[0]?.status).toBe("assembling");
    expect(parsed?.data[0]?.paymentControlStatus).toBe("none");
    expect(parsed?.pagination?.totalItems).toBe(1);
  });

  it("parses order detail payload with item-level data", () => {
    const parsed = parse_order_detail_payload({
      data: {
        id: "order_2",
        orderNumber: "ORD-2",
        dealId: "deal_2",
        clientId: "client_2",
        status: "ready_for_shipment",
        paymentControlStatus: "on_control",
        paymentControlDueAt: "2026-04-11T10:00:00.000Z",
        fulfillmentType: "manual",
        deliveryStatus: "scheduled",
        currency: "RUB",
        subtotalAmount: "5000.00",
        discountAmount: "0.00",
        totalAmount: "5000.00",
        notes: "priority",
        readyForPartialShipmentAt: null,
        readyForShipmentAt: "2026-04-11T10:00:00.000Z",
        partiallyShippedAt: null,
        shippedAt: null,
        createdAt: "2026-04-11T09:00:00.000Z",
        updatedAt: "2026-04-11T10:00:00.000Z",
        version: 3,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        isDeleted: false,
        items: [
          {
            id: "item_1",
            lineNo: 1,
            productId: "product_1",
            productNameSnapshot: "Tile",
            qty: "5",
            unit: "шт",
            retailPrice: "1000.00",
            discountAmount: "0.00",
            lineTotal: "5000.00",
            costSnapshot: null,
            notes: null,
            createdAt: "2026-04-11T09:00:00.000Z",
            updatedAt: "2026-04-11T09:00:00.000Z",
            version: 1
          }
        ],
        paymentIds: ["payment_1"],
        deliveryTaskIds: [],
        returnRequestIds: []
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe("ready_for_shipment");
    expect(parsed?.paymentControlStatus).toBe("on_control");
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0]?.unit).toBe("шт");
  });

  it("parses fulfillment collection payload and keeps status contract", () => {
    const parsed = parse_fulfillment_collection_payload({
      data: [
        {
          id: "fulfillment_1",
          orderId: "order_2",
          status: "pending",
          fulfillmentType: "delivery",
          fulfilledAt: null,
          failureReason: null,
          createdAt: "2026-04-11T09:00:00.000Z",
          updatedAt: "2026-04-11T09:10:00.000Z",
          version: 1,
          itemsCount: 1
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
    expect(parsed?.data[0]?.status).toBe("pending");
    expect(parsed?.data[0]?.orderId).toBe("order_2");
  });

  it("filters fulfillments by selected order for page-level data handling", () => {
    const filtered = filter_fulfillments_by_order(
      [
        {
          id: "fulfillment_1",
          orderId: "order_1",
          status: "completed",
          fulfillmentType: "delivery",
          fulfilledAt: "2026-04-11T12:00:00.000Z",
          failureReason: null,
          createdAt: "2026-04-11T11:00:00.000Z",
          updatedAt: "2026-04-11T12:00:00.000Z",
          version: 2,
          itemsCount: 1
        },
        {
          id: "fulfillment_2",
          orderId: "order_2",
          status: "pending",
          fulfillmentType: "manual",
          fulfilledAt: null,
          failureReason: null,
          createdAt: "2026-04-11T11:00:00.000Z",
          updatedAt: "2026-04-11T11:00:00.000Z",
          version: 1,
          itemsCount: 1
        }
      ],
      "order_2"
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("fulfillment_2");
  });

  it("rejects malformed order payload when status surfaces are missing", () => {
    const parsed = parse_order_collection_payload({
      data: [
        {
          id: "order_3",
          orderNumber: "ORD-3"
        }
      ]
    });

    expect(parsed).toBeNull();
  });
});
