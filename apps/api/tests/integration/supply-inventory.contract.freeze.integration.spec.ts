import { describe, expect, it } from "vitest";
import {
  movement_quarantine_foundation_contract,
  purchase_receipt_role_matrix_contract,
  product_supplier_role_matrix_contract,
  reservation_foundation_contract,
  stock_lock_role_matrix_contract,
  supplier_request_file_access_contract,
  supplier_request_role_matrix_contract,
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
      "product_supplier",
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

  it("marks read-side resources split between implemented and deferred for Supply Step 8", () => {
    expect(supply_inventory_read_side_contract.freezePhase).toBe(
      "supply-step-8-inventory-movement-quarantine-baseline"
    );
    expect(supply_inventory_read_side_contract.implementedCollections).toEqual([
      "suppliers",
      "supplier-requests",
      "purchase-receipts",
      "product-suppliers",
      "stock-locks",
      "reservations",
      "inventory-movements"
    ]);
    expect(supply_inventory_read_side_contract.deferredCollections).toEqual([
      "products",
      "warehouses",
      "stock-balances"
    ]);
  });

  it("keeps supplier request role matrix fixed for status command flow", () => {
    expect(supplier_request_role_matrix_contract.create).toEqual(["seller"]);
    expect(supplier_request_role_matrix_contract.confirmBySupplier).toEqual(["seller"]);
    expect(supplier_request_role_matrix_contract.markPaid).toEqual(["finance", "ceo"]);
    expect(supplier_request_role_matrix_contract.markStocked).toEqual(["warehouse"]);
    expect(supplier_request_role_matrix_contract.listAndStatusVisibility).toBe("all_roles");
  });

  it("keeps purchase receipt role matrix baseline fixed", () => {
    expect(purchase_receipt_role_matrix_contract.create).toEqual(["warehouse"]);
    expect(purchase_receipt_role_matrix_contract.listAndDetailVisibility).toBe("all_roles");
  });

  it("keeps product supplier sourcing matrix access fixed", () => {
    expect(product_supplier_role_matrix_contract.create).toEqual(["finance", "admin", "ceo"]);
    expect(product_supplier_role_matrix_contract.patch).toEqual(["finance", "admin", "ceo"]);
    expect(product_supplier_role_matrix_contract.listAndDetailVisibility).toBe("all_roles");
    expect(product_supplier_role_matrix_contract.basePurchasePriceHiddenFor).toEqual([
      "seller",
      "warehouse",
      "logistics"
    ]);
    expect(product_supplier_role_matrix_contract.basePurchasePriceVisibleFor).toEqual([
      "finance",
      "ceo",
      "admin"
    ]);
  });

  it("keeps stock lock role matrix baseline fixed", () => {
    expect(stock_lock_role_matrix_contract.create).toEqual(["seller"]);
    expect(stock_lock_role_matrix_contract.release).toEqual(["seller"]);
    expect(stock_lock_role_matrix_contract.listAndDetailVisibility).toBe("all_roles");
  });

  it("keeps reservation foundation baseline fixed before Orders core", () => {
    expect(reservation_foundation_contract.createApi).toBe("internal_only_until_orders_core");
    expect(reservation_foundation_contract.releaseApi).toBe("internal_only_until_orders_core");
    expect(reservation_foundation_contract.listAndDetailVisibility).toBe("all_roles");
    expect(reservation_foundation_contract.requiresOrderId).toBe(true);
    expect(reservation_foundation_contract.forbidsIssueWriteoffSideEffects).toBe(true);
  });

  it("keeps attachment matrix at contract/access baseline with explicit deferred storage", () => {
    expect(supplier_request_file_access_contract.attachRoles).toEqual([
      "warehouse",
      "finance",
      "ceo"
    ]);
    expect(supplier_request_file_access_contract.viewRoles).toEqual([
      "warehouse",
      "finance",
      "ceo"
    ]);
    expect(supplier_request_file_access_contract.storageImplementation).toBe(
      "deferred_step_4_contract_access_baseline"
    );
  });

  it("keeps inventory movement + quarantine foundation baseline fixed", () => {
    expect(movement_quarantine_foundation_contract.readApi).toBe("implemented");
    expect(movement_quarantine_foundation_contract.createApi).toBe("narrow_commands_only");
    expect(movement_quarantine_foundation_contract.supportedMovementTypes).toEqual([
      "receipt",
      "reservation_create",
      "reservation_release",
      "transfer_to_quarantine",
      "release_from_quarantine"
    ]);
    expect(movement_quarantine_foundation_contract.issueFlow).toBe(
      "deferred_until_orders_fulfillment"
    );
    expect(movement_quarantine_foundation_contract.quarantineIsExplicitBucket).toBe(true);
    expect(movement_quarantine_foundation_contract.returnToStockDefaultBucket).toBe("quarantine");
  });
});
