import { describe, expect, it } from "vitest";
import { logistics_fulfillment_command_contract } from "../../src/contracts/logistics-fulfillment.contract";
import { DeliveryTasksController } from "../../src/modules/logistics/delivery-tasks.controller";
import { DeliveryTasksReadController } from "../../src/modules/read-side/logistics/delivery-task.read.controller";

describe("delivery task API baseline integration", () => {
  it("keeps approved command endpoint contract for Logistics Step 2", () => {
    expect(logistics_fulfillment_command_contract.createDeliveryTask.path).toBe("/delivery-tasks");
    expect(logistics_fulfillment_command_contract.assignDeliveryTask.path).toBe(
      "/delivery-tasks/:taskId/assign"
    );
    expect(logistics_fulfillment_command_contract.startTransitDeliveryTask.path).toBe(
      "/delivery-tasks/:taskId/start-transit"
    );
    expect(logistics_fulfillment_command_contract.deliverDeliveryTask.path).toBe(
      "/delivery-tasks/:taskId/deliver"
    );
    expect(logistics_fulfillment_command_contract.failDeliveryTask.path).toBe(
      "/delivery-tasks/:taskId/fail"
    );
    expect(logistics_fulfillment_command_contract.rescheduleDeliveryTask.path).toBe(
      "/delivery-tasks/:taskId/reschedule"
    );
  });

  it("keeps implemented delivery-task controller surface aligned with contract", () => {
    const commandController = DeliveryTasksController.prototype as unknown as Record<string, unknown>;
    expect(typeof commandController.create).toBe("function");
    expect(typeof commandController.assign).toBe("function");
    expect(typeof commandController.startTransit).toBe("function");
    expect(typeof commandController.deliver).toBe("function");
    expect(typeof commandController.fail).toBe("function");
    expect(typeof commandController.reschedule).toBe("function");

    const readController = DeliveryTasksReadController.prototype as unknown as Record<string, unknown>;
    expect(typeof readController.list).toBe("function");
    expect(typeof readController.detail).toBe("function");
  });
});
