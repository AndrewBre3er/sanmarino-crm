import { describe, expect, it } from "vitest";
import { aggregate_order_delivery_status_from_tasks } from "../../src/modules/logistics/order-delivery-status.aggregate";

describe("order delivery status aggregation", () => {
  it("returns not_scheduled when no delivery tasks are linked", () => {
    expect(aggregate_order_delivery_status_from_tasks([])).toBe("not_scheduled");
  });

  it("returns scheduled when active delivery tasks exist", () => {
    expect(aggregate_order_delivery_status_from_tasks(["planned"])).toBe("scheduled");
    expect(aggregate_order_delivery_status_from_tasks(["assigned", "in_transit"])).toBe(
      "scheduled"
    );
  });

  it("returns partially_delivered for mixed delivered + non-delivered tasks", () => {
    expect(aggregate_order_delivery_status_from_tasks(["delivered", "assigned"])).toBe(
      "partially_delivered"
    );
    expect(aggregate_order_delivery_status_from_tasks(["delivered", "failed"])).toBe(
      "partially_delivered"
    );
  });

  it("returns delivered only when all linked tasks are delivered", () => {
    expect(aggregate_order_delivery_status_from_tasks(["delivered"])).toBe("delivered");
    expect(aggregate_order_delivery_status_from_tasks(["delivered", "delivered"])).toBe(
      "delivered"
    );
  });

  it("returns failed only when all linked tasks are failed", () => {
    expect(aggregate_order_delivery_status_from_tasks(["failed"])).toBe("failed");
    expect(aggregate_order_delivery_status_from_tasks(["failed", "planned"])).toBe("scheduled");
  });
});

