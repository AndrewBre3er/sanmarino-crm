import { describe, expect, it } from "vitest";
import {
  logistics_fulfillment_boundary_rules_contract,
  logistics_fulfillment_command_contract,
  logistics_fulfillment_entities,
  logistics_fulfillment_event_contract,
  logistics_fulfillment_linkage_contract,
  logistics_fulfillment_out_of_scope_contract,
  logistics_fulfillment_read_side_contract,
  logistics_fulfillment_resource_contract,
  logistics_fulfillment_status_contract
} from "../../src/contracts/logistics-fulfillment.contract";
import {
  delivery_task_statuses,
  fulfillment_statuses,
  logistics_route_day_statuses,
  logistics_slot_statuses,
  order_delivery_statuses,
  order_fulfillment_types
} from "../../src/modules/transactional/shared/status.contract";

describe("logistics + fulfillment contract freeze", () => {
  it("keeps Logistics Step 1 entity scope fixed", () => {
    expect(logistics_fulfillment_entities).toEqual([
      "delivery_slot",
      "pickup_window",
      "driver",
      "vehicle",
      "route_day",
      "delivery_task",
      "delivery_task_item",
      "fulfillment",
      "fulfillment_item",
      "order.delivery_status(read_surface)"
    ]);
  });

  it("keeps logistics linkage contract fixed (orders/fulfillments/tasks split)", () => {
    expect(logistics_fulfillment_linkage_contract.ordersToDeliveryTasks).toBe(
      "orders.orders(id)->logistics.delivery_tasks.order_id(1_to_many)"
    );
    expect(logistics_fulfillment_linkage_contract.fulfillmentsToDeliveryTask).toBe(
      "orders.fulfillments.delivery_task_id->logistics.delivery_tasks.id(nullable)"
    );
    expect(logistics_fulfillment_linkage_contract.fulfillmentsToPickupWindow).toBe(
      "orders.fulfillments.pickup_window_id->logistics.pickup_windows.id(nullable)"
    );
    expect(logistics_fulfillment_linkage_contract.orderDeliveryStatusReadSurface).toBe(
      "orders.orders.delivery_status(aggregate_only)"
    );
  });

  it("keeps logistics/fulfillment enums aligned with transactional status layer", () => {
    expect(logistics_fulfillment_status_contract.deliveryTask).toEqual(delivery_task_statuses);
    expect(logistics_fulfillment_status_contract.orderDeliveryAggregation).toEqual(
      order_delivery_statuses
    );
    expect(logistics_fulfillment_status_contract.fulfillmentStatus).toEqual(fulfillment_statuses);
    expect(logistics_fulfillment_status_contract.fulfillmentType).toEqual(order_fulfillment_types);
    expect(logistics_fulfillment_status_contract.slotStatus).toEqual(logistics_slot_statuses);
    expect(logistics_fulfillment_status_contract.routeDayStatus).toEqual(
      logistics_route_day_statuses
    );
  });

  it("keeps approved logistics resource surface fixed", () => {
    expect(logistics_fulfillment_resource_contract.deliverySlots.create).toEqual({
      method: "POST",
      path: "/delivery-slots"
    });
    expect(logistics_fulfillment_resource_contract.pickupWindows.patch).toEqual({
      method: "PATCH",
      path: "/pickup-windows/:pickupWindowId"
    });
    expect(logistics_fulfillment_resource_contract.routeDays.create).toEqual({
      method: "POST",
      path: "/route-days"
    });
    expect(logistics_fulfillment_resource_contract.deliveryTasks.list).toEqual({
      method: "GET",
      path: "/delivery-tasks"
    });
    expect(logistics_fulfillment_resource_contract.fulfillments.createForOrder).toEqual({
      method: "POST",
      path: "/orders/:orderId/fulfillments"
    });
  });

  it("freezes command-style logistics/fulfillment mutations with idempotency", () => {
    expect(logistics_fulfillment_command_contract.createDeliveryTask).toEqual({
      method: "POST",
      path: "/delivery-tasks",
      requiresIdempotencyKey: true
    });
    expect(logistics_fulfillment_command_contract.assignDeliveryTask).toEqual({
      method: "POST",
      path: "/delivery-tasks/:taskId/assign",
      requiresIdempotencyKey: true
    });
    expect(logistics_fulfillment_command_contract.startTransitDeliveryTask).toEqual({
      method: "POST",
      path: "/delivery-tasks/:taskId/start-transit",
      requiresIdempotencyKey: true
    });
    expect(logistics_fulfillment_command_contract.deliverDeliveryTask).toEqual({
      method: "POST",
      path: "/delivery-tasks/:taskId/deliver",
      requiresIdempotencyKey: true
    });
    expect(logistics_fulfillment_command_contract.failDeliveryTask).toEqual({
      method: "POST",
      path: "/delivery-tasks/:taskId/fail",
      requiresIdempotencyKey: true
    });
    expect(logistics_fulfillment_command_contract.rescheduleDeliveryTask).toEqual({
      method: "POST",
      path: "/delivery-tasks/:taskId/reschedule",
      requiresIdempotencyKey: true
    });
    expect(logistics_fulfillment_command_contract.confirmFulfillmentExecution).toEqual({
      method: "POST",
      path: "/fulfillments/:fulfillmentId/confirm-execution",
      requiresIdempotencyKey: true
    });
    expect(logistics_fulfillment_command_contract.forbiddenStatusPatchEndpoints).toEqual([
      {
        method: "PATCH",
        path: "/delivery-tasks/:taskId",
        statusMutationAllowed: false
      },
      {
        method: "PATCH",
        path: "/fulfillments/:fulfillmentId",
        statusMutationAllowed: false
      }
    ]);
  });

  it("keeps logistics + fulfillment boundary rules fixed", () => {
    expect(logistics_fulfillment_boundary_rules_contract.orderToDeliveryTaskCardinality).toBe(
      "1_to_many"
    );
    expect(logistics_fulfillment_boundary_rules_contract.partiallyDeliveredRequired).toBe(true);
    expect(logistics_fulfillment_boundary_rules_contract.orderDeliveryStatusSource).toBe(
      "aggregate_from_delivery_tasks_read_surface_only"
    );
    expect(logistics_fulfillment_boundary_rules_contract.issueInventorySource).toBe(
      "confirmed_fulfillment_execution_only"
    );
    expect(
      logistics_fulfillment_boundary_rules_contract.deliveryTaskAndFulfillmentAreDistinctAggregates
    ).toBe(true);
    expect(
      logistics_fulfillment_boundary_rules_contract.criticalMutationsRequireIdempotencyKey
    ).toBe(true);
    expect(logistics_fulfillment_boundary_rules_contract.crossDomainSideEffects).toBe(
      "atomic_or_compensated"
    );
  });

  it("freezes approved logistics/fulfillment event surface only", () => {
    expect(logistics_fulfillment_event_contract).toEqual({
      deliveryTaskCreated: "delivery_task.created",
      deliveryTaskAssigned: "delivery_task.assigned",
      deliveryTaskInTransit: "delivery_task.in_transit",
      deliveryTaskDelivered: "delivery_task.delivered",
      deliveryTaskFailed: "delivery_task.failed",
      deliveryTaskRescheduled: "delivery_task.rescheduled",
      pickupIssued: "pickup.issued",
      orderDeliveryStatusAggregated: "order.delivery_status_aggregated",
      inventoryIssueRecorded: "inventory.issue.recorded",
      orderPartiallyShipped: "order.partially_shipped",
      orderShipped: "order.shipped"
    });
  });

  it("marks read-side and out-of-scope boundaries for Logistics Step 1", () => {
    expect(logistics_fulfillment_read_side_contract.freezePhase).toBe(
      "logistics-step-1-contract-freeze"
    );
    expect(logistics_fulfillment_read_side_contract.implementedCollections).toEqual([
      "delivery-tasks",
      "fulfillments",
      "orders"
    ]);
    expect(logistics_fulfillment_read_side_contract.deferredCollections).toEqual([
      "delivery-slots",
      "pickup-windows",
      "drivers",
      "vehicles",
      "route-days",
      "delivery-task-items"
    ]);

    expect(logistics_fulfillment_out_of_scope_contract.returnsLogic).toBe("deferred");
    expect(logistics_fulfillment_out_of_scope_contract.reconciliationWorkers).toBe("deferred");
    expect(logistics_fulfillment_out_of_scope_contract.kpiReporting).toBe("deferred");
    expect(logistics_fulfillment_out_of_scope_contract.routeOptimization).toBe("deferred");
    expect(logistics_fulfillment_out_of_scope_contract.schedulerDispatchEngine).toBe("deferred");
    expect(logistics_fulfillment_out_of_scope_contract.webUi).toBe("deferred");
  });
});
