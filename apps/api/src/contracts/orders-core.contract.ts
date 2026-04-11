export const orders_core_entities = [
  "order",
  "order_item",
  "fulfillment"
] as const;

export const orders_core_status_contract = {
  order: [
    "assembling",
    "ready_for_partial_shipment",
    "ready_for_shipment",
    "partially_shipped",
    "shipped"
  ] as const,
  controlOverlay: ["none", "on_control", "problem"] as const,
  deliveryAggregation: [
    "not_scheduled",
    "scheduled",
    "partially_delivered",
    "delivered",
    "failed"
  ] as const,
  fulfillment: ["pending", "completed", "failed", "cancelled"] as const
} as const;

export const orders_core_boundary_contract = {
  canonicalCreationPath: "auto_create_from_deal_by_coverage_rules" as const,
  creationImplementationPhase: "orders-step-2" as const,
  initialStatus: "assembling" as const,
  partialShipmentMustRemainInModel: true as const,
  deliveryStatusIsAggregatedFromDeliveryTasks: true as const,
  overlaysAreSeparatedFromMainStatus: true as const
} as const;

export const orders_core_read_side_contract = {
  implementedCollections: ["orders"] as const,
  deferredCollections: ["fulfillments"] as const,
  freezePhase: "orders-step-1-contract-freeze" as const
} as const;

export const orders_core_out_of_scope_contract = {
  logisticsExecution: "deferred" as const,
  paymentsFlow: "deferred" as const,
  financeReflection: "deferred" as const,
  returnsFlow: "deferred" as const,
  workerReconciliationJobs: "deferred" as const,
  kpiAnalytics: "deferred" as const
} as const;
