export const supply_inventory_entities = [
  "supplier",
  "supplier_request",
  "supplier_request_item",
  "purchase_receipt",
  "purchase_receipt_item",
  "product",
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
    "stock-locks"
  ] as const,
  deferredCollections: [
    "products",
    "warehouses",
    "stock-balances",
    "reservations",
    "inventory-movements"
  ] as const,
  freezePhase: "supply-step-6-soft-lock-pre-reserve-baseline"
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

export const stock_lock_role_matrix_contract = {
  create: ["seller"] as const,
  release: ["seller"] as const,
  listAndDetailVisibility: "all_roles" as const
} as const;

export const supplier_request_file_access_contract = {
  attachRoles: ["warehouse", "finance", "ceo"] as const,
  viewRoles: ["warehouse", "finance", "ceo"] as const,
  storageImplementation: "deferred_step_4_contract_access_baseline" as const
} as const;
