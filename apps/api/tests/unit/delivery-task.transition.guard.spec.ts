import { describe, expect, it } from "vitest";
import {
  assert_delivery_task_status_transition,
  delivery_task_status_transition_matrix
} from "../../src/modules/transactional/logistics/delivery-task.transition.guard";

describe("delivery task transition guard", () => {
  it("keeps the approved Logistics Step 2 transition matrix", () => {
    expect(delivery_task_status_transition_matrix).toEqual({
      planned: ["assigned", "rescheduled", "failed"],
      assigned: ["in_transit", "rescheduled", "failed"],
      in_transit: ["delivered", "failed"],
      rescheduled: [],
      delivered: [],
      failed: []
    });
  });

  it("allows only approved transitions", () => {
    expect(() => assert_delivery_task_status_transition("planned", "assigned")).not.toThrow();
    expect(() => assert_delivery_task_status_transition("assigned", "in_transit")).not.toThrow();
    expect(() => assert_delivery_task_status_transition("in_transit", "delivered")).not.toThrow();
    expect(() => assert_delivery_task_status_transition("planned", "failed")).not.toThrow();
    expect(() => assert_delivery_task_status_transition("assigned", "failed")).not.toThrow();
    expect(() => assert_delivery_task_status_transition("in_transit", "failed")).not.toThrow();
    expect(() => assert_delivery_task_status_transition("planned", "rescheduled")).not.toThrow();
    expect(() => assert_delivery_task_status_transition("assigned", "rescheduled")).not.toThrow();
  });

  it("rejects transitions outside approved matrix", () => {
    expect(() => assert_delivery_task_status_transition("in_transit", "rescheduled")).toThrowError();
    expect(() => assert_delivery_task_status_transition("rescheduled", "assigned")).toThrowError();
    expect(() => assert_delivery_task_status_transition("delivered", "planned")).toThrowError();
    expect(() => assert_delivery_task_status_transition("failed", "planned")).toThrowError();
  });
});

