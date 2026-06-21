import { describe, expect, it } from "vitest";
import {
  parse_expense_collection_payload,
  parse_expense_detail_payload,
  parse_finance_entry_collection_payload,
  parse_finance_entry_detail_payload,
  parse_marketing_expense_collection_payload,
  parse_marketing_expense_detail_payload
} from "../src/lib/finance/finance-contract";

describe("finance contract payload parsers", () => {
  it("parses finance entries collection payload with payment/order/expense linkage", () => {
    const parsed = parse_finance_entry_collection_payload({
      data: [
        {
          id: "entry_1",
          entryType: "income",
          amount: "7500.00",
          currency: "RUB",
          recognizedAt: "2026-04-12T12:00:00.000Z",
          paymentId: "payment_1",
          expenseId: null,
          marketingExpenseId: null,
          orderId: "order_1",
          cashOperationId: "cash_op_1",
          description: "Payment completed"
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
    expect(parsed?.data[0]?.entryType).toBe("income");
    expect(parsed?.data[0]?.paymentId).toBe("payment_1");
    expect(parsed?.pagination?.totalPages).toBe(1);
  });

  it("parses finance entry detail payload", () => {
    const parsed = parse_finance_entry_detail_payload({
      data: {
        id: "entry_2",
        entryType: "expense",
        amount: "1500.00",
        currency: "RUB",
        recognizedAt: "2026-04-12T13:00:00.000Z",
        paymentId: null,
        expenseId: "expense_1",
        marketingExpenseId: null,
        orderId: null,
        cashOperationId: null,
        description: "Operational expense"
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.entryType).toBe("expense");
    expect(parsed?.expenseId).toBe("expense_1");
  });

  it("parses expenses collection and detail payloads", () => {
    const collection = parse_expense_collection_payload({
      data: [
        {
          id: "expense_1",
          expenseType: "operational",
          amount: "4200.00",
          currency: "RUB",
          occurredAt: "2026-04-12T09:00:00.000Z",
          description: "Office rent",
          relatedOrderId: null,
          createdAt: "2026-04-12T09:00:00.000Z",
          updatedAt: "2026-04-12T09:00:00.000Z"
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

    const detail = parse_expense_detail_payload({
      data: {
        id: "expense_2",
        expenseType: "logistics",
        amount: "900.00",
        currency: "RUB",
        occurredAt: "2026-04-12T10:00:00.000Z",
        description: null,
        relatedOrderId: "order_2",
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:30:00.000Z"
      }
    });

    expect(collection).not.toBeNull();
    expect(collection?.data).toHaveLength(1);
    expect(collection?.data[0]?.expenseType).toBe("operational");
    expect(detail).not.toBeNull();
    expect(detail?.relatedOrderId).toBe("order_2");
  });

  it("parses marketing expenses collection and detail payloads", () => {
    const collection = parse_marketing_expense_collection_payload({
      data: [
        {
          id: "mkt_1",
          source: "telegram",
          campaign: "april",
          amount: "600.00",
          currency: "RUB",
          occurredAt: "2026-04-12T08:00:00.000Z",
          description: "Banner",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:10:00.000Z"
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

    const detail = parse_marketing_expense_detail_payload({
      data: {
        id: "mkt_2",
        source: "vk",
        campaign: null,
        amount: "300.00",
        currency: "RUB",
        occurredAt: "2026-04-12T09:00:00.000Z",
        description: null,
        createdAt: "2026-04-12T09:00:00.000Z",
        updatedAt: "2026-04-12T09:05:00.000Z"
      }
    });

    expect(collection).not.toBeNull();
    expect(collection?.data).toHaveLength(1);
    expect(collection?.data[0]?.source).toBe("telegram");
    expect(detail).not.toBeNull();
    expect(detail?.source).toBe("vk");
  });

  it("rejects malformed finance payload", () => {
    const parsed = parse_finance_entry_collection_payload({
      data: [{ id: "entry_invalid", entryType: "income" }]
    });

    expect(parsed).toBeNull();
  });
});
