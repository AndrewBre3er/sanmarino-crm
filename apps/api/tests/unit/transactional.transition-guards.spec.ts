import { describe, expect, it } from "vitest";
import {
  assert_deal_status_transition,
  assert_lead_status_transition,
  assert_delivery_task_status_transition,
  assert_order_status_transition,
  assert_payment_status_transition,
  assert_return_request_status_transition
} from "../../src/modules/transactional";

describe("transactional status transition guards", () => {
  it("allows canonical deal transition and blocks rollback from converted state", () => {
    expect(() =>
      assert_deal_status_transition("in_progress", "converted_to_order")
    ).not.toThrow();
    expect(() =>
      assert_deal_status_transition("converted_to_order", "in_progress")
    ).toThrowError();
  });

  it("allows only new -> in_processing/cancelled for lead", () => {
    expect(() => assert_lead_status_transition("new", "in_processing")).not.toThrow();
    expect(() => assert_lead_status_transition("new", "cancelled")).not.toThrow();
    expect(() => assert_lead_status_transition("in_processing", "cancelled")).toThrowError();
  });

  it("blocks order transitions outside accepted matrix", () => {
    expect(() => assert_order_status_transition("completed", "partial_return")).not.toThrow();
    expect(() => assert_order_status_transition("draft", "partial_return")).toThrowError();
  });

  it("rejects delivered -> planned for delivery task", () => {
    expect(() => assert_delivery_task_status_transition("delivered", "planned")).toThrowError();
  });

  it("keeps return request command transition discipline", () => {
    expect(() => assert_return_request_status_transition("submitted", "approved")).not.toThrow();
    expect(() => assert_return_request_status_transition("closed", "draft")).toThrowError();
  });

  it("rejects payment rollback completed -> pending", () => {
    expect(() => assert_payment_status_transition("completed", "pending")).toThrowError();
  });
});
