import { describe, expect, it } from "vitest";
import { assert_order_fulfillment_invariant } from "../../src/modules/transactional";

describe("order fulfillment invariant guard", () => {
  it("requires at least one active task for delivery before entering flow", () => {
    expect(() =>
      assert_order_fulfillment_invariant(
        {
          orderId: "order_1",
          fulfillmentType: "delivery",
          activeDeliveryTaskCount: 0
        },
        { enteringDeliveryFlow: true }
      )
    ).toThrowError();
  });

  it("accepts delivery flow entry with active delivery task", () => {
    expect(() =>
      assert_order_fulfillment_invariant(
        {
          orderId: "order_2",
          fulfillmentType: "delivery",
          activeDeliveryTaskCount: 1
        },
        { enteringDeliveryFlow: true }
      )
    ).not.toThrow();
  });

  it("requires pickup to have zero active delivery tasks", () => {
    expect(() =>
      assert_order_fulfillment_invariant(
        {
          orderId: "order_3",
          fulfillmentType: "pickup",
          activeDeliveryTaskCount: 1
        },
        { enteringDeliveryFlow: false }
      )
    ).toThrowError();
  });

  it("treats manual fulfillment as TODO-restricted for delivery flow", () => {
    expect(() =>
      assert_order_fulfillment_invariant(
        {
          orderId: "order_4",
          fulfillmentType: "manual",
          activeDeliveryTaskCount: 1
        },
        { enteringDeliveryFlow: true }
      )
    ).toThrowError();
  });
});
