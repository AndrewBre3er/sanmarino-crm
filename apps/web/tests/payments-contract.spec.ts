import { describe, expect, it } from "vitest";
import {
  parse_payment_collection_payload,
  parse_payment_detail_payload
} from "../src/lib/payments/payments-contract";

describe("payments contract payload parsers", () => {
  it("parses payment collection payload from backend read-side response", () => {
    const parsed = parse_payment_collection_payload({
      data: [
        {
          id: "payment_1",
          paymentNumber: "PAY-1",
          orderId: "order_1",
          status: "pending",
          paymentMethod: "cash",
          amount: "1200.00",
          refundedAmount: "0.00",
          receivedAt: null,
          externalReference: "EXT-1",
          createdAt: "2026-04-12T10:00:00.000Z",
          updatedAt: "2026-04-12T10:01:00.000Z",
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
    expect(parsed?.data[0]?.status).toBe("pending");
    expect(parsed?.data[0]?.paymentMethod).toBe("cash");
    expect(parsed?.pagination?.totalItems).toBe(1);
  });

  it("parses payment detail payload", () => {
    const parsed = parse_payment_detail_payload({
      data: {
        id: "payment_2",
        paymentNumber: "PAY-2",
        orderId: "order_2",
        status: "completed",
        paymentMethod: "bank_transfer",
        amount: "5600.00",
        refundedAmount: "100.00",
        receivedAt: "2026-04-12T11:00:00.000Z",
        externalReference: null,
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T11:00:00.000Z",
        version: 2,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        isDeleted: false
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe("completed");
    expect(parsed?.receivedAt).toBe("2026-04-12T11:00:00.000Z");
  });

  it("rejects malformed payment payload", () => {
    const parsed = parse_payment_collection_payload({
      data: [{ id: "payment_3", paymentNumber: "PAY-3" }]
    });

    expect(parsed).toBeNull();
  });
});
