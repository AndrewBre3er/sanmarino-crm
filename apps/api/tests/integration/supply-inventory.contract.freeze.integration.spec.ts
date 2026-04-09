import { describe, expect, it } from "vitest";
import {
  supply_inventory_entities,
  supply_inventory_read_side_contract,
  supply_inventory_status_contract
} from "../../src/contracts/supply-inventory.contract";
import {
  inventory_bucket_statuses,
  inventory_movement_types,
  product_units,
  reservation_statuses,
  stock_lock_statuses,
  supplier_request_statuses
} from "../../src/modules/transactional/shared/status.contract";

describe("supply + inventory contract freeze", () => {
  it("keeps supply entity scope fixed for Step 1", () => {
    expect(supply_inventory_entities).toEqual([
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
    ]);
  });

  it("keeps Supply/Inventory statuses aligned between API and transactional layer", () => {
    expect(supply_inventory_status_contract.supplierRequest).toEqual(supplier_request_statuses);
    expect(supply_inventory_status_contract.productUnit).toEqual(product_units);
    expect(supply_inventory_status_contract.stockLock).toEqual(stock_lock_statuses);
    expect(supply_inventory_status_contract.reservation).toEqual(reservation_statuses);
    expect(supply_inventory_status_contract.inventoryMovement).toEqual(inventory_movement_types);
    expect(supply_inventory_status_contract.inventoryBucket).toEqual(inventory_bucket_statuses);
  });

  it("marks read-side resources split between implemented and deferred for Supply Step 3", () => {
    expect(supply_inventory_read_side_contract.freezePhase).toBe(
      "supply-step-3-supplier-backend-baseline"
    );
    expect(supply_inventory_read_side_contract.implementedCollections).toEqual([
      "suppliers",
      "supplier-requests"
    ]);
    expect(supply_inventory_read_side_contract.deferredCollections).toEqual([
      "purchase-receipts",
      "products",
      "warehouses",
      "stock-balances",
      "stock-locks",
      "reservations",
      "inventory-movements"
    ]);
  });
});
