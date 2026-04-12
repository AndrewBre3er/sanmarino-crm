import { describe, expect, it } from "vitest";
import { logistics_fulfillment_resource_contract } from "../../src/contracts/logistics-fulfillment.contract";
import { LogisticsResourcesController } from "../../src/modules/logistics/logistics-resources.controller";

describe("logistics resource API baseline integration", () => {
  it("keeps approved logistics resource endpoint contract for Step 4", () => {
    expect(logistics_fulfillment_resource_contract.deliverySlots.list.path).toBe("/delivery-slots");
    expect(logistics_fulfillment_resource_contract.deliverySlots.getById.path).toBe(
      "/delivery-slots/:slotId"
    );
    expect(logistics_fulfillment_resource_contract.pickupWindows.list.path).toBe(
      "/pickup-windows"
    );
    expect(logistics_fulfillment_resource_contract.pickupWindows.getById.path).toBe(
      "/pickup-windows/:pickupWindowId"
    );
    expect(logistics_fulfillment_resource_contract.routeDays.list.path).toBe("/route-days");
    expect(logistics_fulfillment_resource_contract.routeDays.getById.path).toBe(
      "/route-days/:routeDayId"
    );
    expect(logistics_fulfillment_resource_contract.drivers.list.path).toBe("/drivers");
    expect(logistics_fulfillment_resource_contract.drivers.getById.path).toBe(
      "/drivers/:driverId"
    );
    expect(logistics_fulfillment_resource_contract.vehicles.list.path).toBe("/vehicles");
    expect(logistics_fulfillment_resource_contract.vehicles.getById.path).toBe(
      "/vehicles/:vehicleId"
    );
  });

  it("exposes list/detail/create/patch handlers for all logistics resources", () => {
    const controller = LogisticsResourcesController.prototype as unknown as Record<string, unknown>;
    expect(typeof controller.listDeliverySlots).toBe("function");
    expect(typeof controller.detailDeliverySlot).toBe("function");
    expect(typeof controller.createDeliverySlot).toBe("function");
    expect(typeof controller.patchDeliverySlot).toBe("function");

    expect(typeof controller.listPickupWindows).toBe("function");
    expect(typeof controller.detailPickupWindow).toBe("function");
    expect(typeof controller.createPickupWindow).toBe("function");
    expect(typeof controller.patchPickupWindow).toBe("function");

    expect(typeof controller.listRouteDays).toBe("function");
    expect(typeof controller.detailRouteDay).toBe("function");
    expect(typeof controller.createRouteDay).toBe("function");
    expect(typeof controller.patchRouteDay).toBe("function");

    expect(typeof controller.listDrivers).toBe("function");
    expect(typeof controller.detailDriver).toBe("function");
    expect(typeof controller.createDriver).toBe("function");
    expect(typeof controller.patchDriver).toBe("function");

    expect(typeof controller.listVehicles).toBe("function");
    expect(typeof controller.detailVehicle).toBe("function");
    expect(typeof controller.createVehicle).toBe("function");
    expect(typeof controller.patchVehicle).toBe("function");
  });
});
