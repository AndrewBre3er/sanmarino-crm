import {
  delivery_task_statuses,
  fulfillment_statuses,
  logistics_route_day_statuses,
  logistics_slot_statuses,
  order_delivery_statuses,
  order_fulfillment_types
} from "../modules/transactional/shared/status.contract";

export const logistics_fulfillment_entities = [
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
] as const;

export const logistics_fulfillment_linkage_contract = {
  ordersToDeliveryTasks: "orders.orders(id)->logistics.delivery_tasks.order_id(1_to_many)",
  deliveryTaskToRouteDay:
    "logistics.delivery_tasks.route_day_id->logistics.route_days.id(nullable)",
  deliveryTaskToDeliverySlot:
    "logistics.delivery_tasks.delivery_slot_id->logistics.delivery_slots.id(nullable)",
  fulfillmentsToOrders: "orders.fulfillments.order_id->orders.orders.id(many_to_one)",
  fulfillmentsToDeliveryTask:
    "orders.fulfillments.delivery_task_id->logistics.delivery_tasks.id(nullable)",
  fulfillmentsToPickupWindow:
    "orders.fulfillments.pickup_window_id->logistics.pickup_windows.id(nullable)",
  deliveryTaskItemsToOrderItems:
    "logistics.delivery_task_items.order_item_id->orders.order_items.id(many_to_one)",
  orderDeliveryStatusReadSurface: "orders.orders.delivery_status(aggregate_only)"
} as const;

export const logistics_fulfillment_status_contract = {
  deliveryTask: delivery_task_statuses,
  orderDeliveryAggregation: order_delivery_statuses,
  fulfillmentStatus: fulfillment_statuses,
  fulfillmentType: order_fulfillment_types,
  slotStatus: logistics_slot_statuses,
  routeDayStatus: logistics_route_day_statuses
} as const;

export const logistics_fulfillment_resource_contract = {
  deliverySlots: {
    create: { method: "POST", path: "/delivery-slots" },
    getById: { method: "GET", path: "/delivery-slots/:slotId" },
    list: { method: "GET", path: "/delivery-slots" },
    patch: { method: "PATCH", path: "/delivery-slots/:slotId" }
  },
  pickupWindows: {
    create: { method: "POST", path: "/pickup-windows" },
    getById: { method: "GET", path: "/pickup-windows/:pickupWindowId" },
    list: { method: "GET", path: "/pickup-windows" },
    patch: { method: "PATCH", path: "/pickup-windows/:pickupWindowId" }
  },
  drivers: {
    create: { method: "POST", path: "/drivers" },
    getById: { method: "GET", path: "/drivers/:driverId" },
    list: { method: "GET", path: "/drivers" },
    patch: { method: "PATCH", path: "/drivers/:driverId" }
  },
  vehicles: {
    create: { method: "POST", path: "/vehicles" },
    getById: { method: "GET", path: "/vehicles/:vehicleId" },
    list: { method: "GET", path: "/vehicles" },
    patch: { method: "PATCH", path: "/vehicles/:vehicleId" }
  },
  routeDays: {
    create: { method: "POST", path: "/route-days" },
    getById: { method: "GET", path: "/route-days/:routeDayId" },
    list: { method: "GET", path: "/route-days" },
    patch: { method: "PATCH", path: "/route-days/:routeDayId" }
  },
  deliveryTasks: {
    create: { method: "POST", path: "/delivery-tasks" },
    getById: { method: "GET", path: "/delivery-tasks/:taskId" },
    list: { method: "GET", path: "/delivery-tasks" }
  },
  fulfillments: {
    createForOrder: { method: "POST", path: "/orders/:orderId/fulfillments" },
    getById: { method: "GET", path: "/fulfillments/:fulfillmentId" },
    listByOrder: { method: "GET", path: "/orders/:orderId/fulfillments" }
  }
} as const;

export const logistics_fulfillment_command_contract = {
  createDeliveryTask: {
    method: "POST",
    path: "/delivery-tasks",
    requiresIdempotencyKey: true
  },
  assignDeliveryTask: {
    method: "POST",
    path: "/delivery-tasks/:taskId/assign",
    requiresIdempotencyKey: true
  },
  startTransitDeliveryTask: {
    method: "POST",
    path: "/delivery-tasks/:taskId/start-transit",
    requiresIdempotencyKey: true
  },
  deliverDeliveryTask: {
    method: "POST",
    path: "/delivery-tasks/:taskId/deliver",
    requiresIdempotencyKey: true
  },
  failDeliveryTask: {
    method: "POST",
    path: "/delivery-tasks/:taskId/fail",
    requiresIdempotencyKey: true
  },
  rescheduleDeliveryTask: {
    method: "POST",
    path: "/delivery-tasks/:taskId/reschedule",
    requiresIdempotencyKey: true
  },
  createOrderFulfillment: {
    method: "POST",
    path: "/orders/:orderId/fulfillments",
    requiresIdempotencyKey: true
  },
  confirmFulfillmentExecution: {
    method: "POST",
    path: "/fulfillments/:fulfillmentId/confirm-execution",
    requiresIdempotencyKey: true
  },
  forbiddenStatusPatchEndpoints: [
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
  ]
} as const;

export const logistics_fulfillment_boundary_rules_contract = {
  orderToDeliveryTaskCardinality: "1_to_many" as const,
  partiallyDeliveredRequired: true as const,
  orderDeliveryStatusSource: "aggregate_from_delivery_tasks_read_surface_only" as const,
  issueInventorySource: "confirmed_fulfillment_execution_only" as const,
  deliveryTaskAndFulfillmentAreDistinctAggregates: true as const,
  criticalMutationsRequireIdempotencyKey: true as const,
  crossDomainSideEffects: "atomic_or_compensated" as const,
  routeOptimizationEngine: "deferred" as const,
  dispatchSchedulerEngine: "deferred" as const
} as const;

export const logistics_fulfillment_event_contract = {
  deliveryTaskCreated: "delivery_task.created" as const,
  deliveryTaskAssigned: "delivery_task.assigned" as const,
  deliveryTaskInTransit: "delivery_task.in_transit" as const,
  deliveryTaskDelivered: "delivery_task.delivered" as const,
  deliveryTaskFailed: "delivery_task.failed" as const,
  deliveryTaskRescheduled: "delivery_task.rescheduled" as const,
  pickupIssued: "pickup.issued" as const,
  orderDeliveryStatusAggregated: "order.delivery_status_aggregated" as const,
  inventoryIssueRecorded: "inventory.issue.recorded" as const,
  orderPartiallyShipped: "order.partially_shipped" as const,
  orderShipped: "order.shipped" as const
} as const;

export const logistics_fulfillment_read_side_contract = {
  implementedCollections: ["delivery-tasks", "fulfillments", "orders"] as const,
  deferredCollections: [
    "delivery-slots",
    "pickup-windows",
    "drivers",
    "vehicles",
    "route-days",
    "delivery-task-items"
  ] as const,
  freezePhase: "logistics-step-1-contract-freeze" as const
} as const;

export const logistics_fulfillment_out_of_scope_contract = {
  returnsLogic: "deferred" as const,
  reconciliationWorkers: "deferred" as const,
  kpiReporting: "deferred" as const,
  routeOptimization: "deferred" as const,
  schedulerDispatchEngine: "deferred" as const,
  webUi: "deferred" as const
} as const;
