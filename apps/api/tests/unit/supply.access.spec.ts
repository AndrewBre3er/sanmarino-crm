import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import { bootstrap_role_codes } from "../../src/modules/auth/auth.contract";
import { InventoryMovementsController } from "../../src/modules/supply/inventory-movements.controller";
import { PurchaseReceiptsController } from "../../src/modules/supply/purchase-receipts.controller";
import { ReservationsController } from "../../src/modules/supply/reservations.controller";
import { StockLocksController } from "../../src/modules/supply/stock-locks.controller";
import { SupplierRequestsController } from "../../src/modules/supply/supplier-requests.controller";
import { SuppliersController } from "../../src/modules/supply/suppliers.controller";

describe("supply access baseline", () => {
  it("keeps supply list/detail endpoints visible for all roles", () => {
    const controllers = [
      SuppliersController,
      SupplierRequestsController,
      PurchaseReceiptsController,
      StockLocksController,
      ReservationsController,
      InventoryMovementsController
    ];

    for (const controller of controllers) {
      const requirements = Reflect.getMetadata(auth_access_metadata_key, controller) as {
        authenticated?: boolean;
        requiredRoleCodes?: string[];
      };

      expect(requirements?.authenticated).toBe(true);
      expect(requirements?.requiredRoleCodes).toEqual([...bootstrap_role_codes]);
    }
  });

  it("keeps action baseline role matrix for create endpoints", () => {
    const supplierCreateRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      SuppliersController.prototype.create
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    const supplierRequestCreateRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      SupplierRequestsController.prototype.create
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    const purchaseReceiptCreateRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      PurchaseReceiptsController.prototype.create
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const stockLockCreateRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      StockLocksController.prototype.create
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(supplierCreateRequirements?.authenticated).toBe(true);
    expect(supplierCreateRequirements?.requiredRoleCodes).toEqual(["seller", "admin", "ceo"]);
    expect(supplierRequestCreateRequirements?.authenticated).toBe(true);
    expect(supplierRequestCreateRequirements?.requiredRoleCodes).toEqual(["seller"]);
    expect(purchaseReceiptCreateRequirements?.authenticated).toBe(true);
    expect(purchaseReceiptCreateRequirements?.requiredRoleCodes).toEqual(["warehouse"]);
    expect(stockLockCreateRequirements?.authenticated).toBe(true);
    expect(stockLockCreateRequirements?.requiredRoleCodes).toEqual(["seller"]);
  });

  it("keeps role matrix for supplier request status commands", () => {
    const confirmRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      SupplierRequestsController.prototype.confirmBySupplier
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const markPaidRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      SupplierRequestsController.prototype.markPaid
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const markStockedRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      SupplierRequestsController.prototype.markStocked
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(confirmRequirements?.requiredRoleCodes).toEqual(["seller"]);
    expect(markPaidRequirements?.requiredRoleCodes).toEqual(["finance", "ceo"]);
    expect(markStockedRequirements?.requiredRoleCodes).toEqual(["warehouse"]);
  });

  it("keeps attachment access matrix for upload and view endpoints", () => {
    const listAttachmentsRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      SupplierRequestsController.prototype.listAttachments
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const attachFileRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      SupplierRequestsController.prototype.attachFile
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(listAttachmentsRequirements?.requiredRoleCodes).toEqual([
      "warehouse",
      "finance",
      "ceo"
    ]);
    expect(attachFileRequirements?.requiredRoleCodes).toEqual([
      "warehouse",
      "finance",
      "ceo"
    ]);
  });

  it("keeps stock lock release role baseline", () => {
    const releaseRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      StockLocksController.prototype.release
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(releaseRequirements?.requiredRoleCodes).toEqual(["seller"]);
  });

  it("keeps reservation foundation mutation API internal-only before Orders core", () => {
    const reservationControllerPrototype = ReservationsController.prototype as {
      create?: unknown;
      release?: unknown;
    };

    expect(reservationControllerPrototype.create).toBeUndefined();
    expect(reservationControllerPrototype.release).toBeUndefined();
  });

  it("keeps quarantine command access baseline for warehouse role", () => {
    const transferRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      InventoryMovementsController.prototype.transferToQuarantine
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const releaseRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      InventoryMovementsController.prototype.releaseFromQuarantine
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(transferRequirements?.requiredRoleCodes).toEqual(["warehouse"]);
    expect(releaseRequirements?.requiredRoleCodes).toEqual(["warehouse"]);
  });
});
