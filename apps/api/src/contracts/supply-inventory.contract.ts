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
  implementedCollections: ["suppliers", "supplier-requests"] as const,
  deferredCollections: [
    "purchase-receipts",
    "products",
    "warehouses",
    "stock-balances",
    "stock-locks",
    "reservations",
    "inventory-movements"
  ] as const,
  freezePhase: "supply-step-3-supplier-backend-baseline"
} as const;
