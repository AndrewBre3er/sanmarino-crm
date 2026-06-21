export const supply_inventory_entities = [
  "supplier",
  "supplier_request",
  "supplier_request_item",
  "purchase_receipt",
  "purchase_receipt_item",
  "product",
  "product_supplier",
  "warehouse",
  "stock_balance",
  "stock_lock",
  "reservation",
  "inventory_movement"
] as const;

export const supply_inventory_status_contract = {
  supplierRequest: ["formed", "confirmed_by_supplier", "paid", "stocked"] as const,
  productUnit: ["шт", "кв.м", "п.м", "услуга"] as const,
  stockLock: ["active", "expired", "released", "promoted"] as const,
  reservation: ["active", "released", "expired", "consumed", "cancelled"] as const,
  inventoryMovement: [
    "receipt",
    "issue",
    "return_to_stock",
    "writeoff",
    "adjustment",
    "reservation_create",
    "reservation_release",
    "transfer_to_quarantine",
    "release_from_quarantine"
  ] as const,
  inventoryBucket: ["on_hand", "reserved", "available", "quarantine"] as const
} as const;

export const supply_inventory_read_side_contract = {
  implementedCollections: [
    "suppliers",
    "supplier-requests",
    "purchase-receipts",
    "product-suppliers",
    "stock-locks",
    "reservations",
    "inventory-movements"
  ] as const,
  deferredCollections: ["products", "warehouses", "stock-balances"] as const,
  freezePhase: "supply-step-8-inventory-movement-quarantine-baseline"
} as const;

export const supplier_request_role_matrix_contract = {
  create: ["seller"] as const,
  confirmBySupplier: ["seller"] as const,
  markPaid: ["finance", "ceo"] as const,
  markStocked: ["warehouse"] as const,
  listAndStatusVisibility: "all_roles" as const
} as const;

export const purchase_receipt_role_matrix_contract = {
  create: ["warehouse"] as const,
  listAndDetailVisibility: "all_roles" as const
} as const;

export const product_supplier_role_matrix_contract = {
  create: ["finance", "admin", "ceo"] as const,
  patch: ["finance", "admin", "ceo"] as const,
  listAndDetailVisibility: "all_roles" as const,
  basePurchasePriceHiddenFor: ["seller", "warehouse", "logistics"] as const,
  basePurchasePriceVisibleFor: ["finance", "ceo", "admin"] as const
} as const;

export const stock_lock_role_matrix_contract = {
  create: ["seller"] as const,
  release: ["seller"] as const,
  listAndDetailVisibility: "all_roles" as const
} as const;

export const reservation_foundation_contract = {
  createApi: "internal_only_until_orders_core" as const,
  releaseApi: "internal_only_until_orders_core" as const,
  listAndDetailVisibility: "all_roles" as const,
  requiresOrderId: true as const,
  forbidsIssueWriteoffSideEffects: true as const
} as const;

export const movement_quarantine_foundation_contract = {
  readApi: "implemented" as const,
  createApi: "narrow_commands_only" as const,
  supportedMovementTypes: [
    "receipt",
    "reservation_create",
    "reservation_release",
    "transfer_to_quarantine",
    "release_from_quarantine"
  ] as const,
  issueFlow: "deferred_until_orders_fulfillment" as const,
  quarantineIsExplicitBucket: true as const,
  returnToStockDefaultBucket: "quarantine" as const
} as const;

export const supplier_request_file_access_contract = {
  attachRoles: ["warehouse", "finance", "ceo"] as const,
  viewRoles: ["warehouse", "finance", "ceo"] as const,
  storageImplementation: "deferred_step_4_contract_access_baseline" as const
} as const;
