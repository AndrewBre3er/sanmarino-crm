import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import { bootstrap_role_codes } from "../../src/modules/auth/auth.contract";
import { PurchaseReceiptsController } from "../../src/modules/supply/purchase-receipts.controller";
import { SupplierRequestsController } from "../../src/modules/supply/supplier-requests.controller";
import { SuppliersController } from "../../src/modules/supply/suppliers.controller";

describe("supply access baseline", () => {
  it("keeps suppliers/supplier-requests/purchase-receipts list/detail visible for all roles", () => {
    const controllers = [SuppliersController, SupplierRequestsController, PurchaseReceiptsController];

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

    expect(supplierCreateRequirements?.authenticated).toBe(true);
    expect(supplierCreateRequirements?.requiredRoleCodes).toEqual(["seller", "admin", "ceo"]);
    expect(supplierRequestCreateRequirements?.authenticated).toBe(true);
    expect(supplierRequestCreateRequirements?.requiredRoleCodes).toEqual(["seller"]);
    expect(purchaseReceiptCreateRequirements?.authenticated).toBe(true);
    expect(purchaseReceiptCreateRequirements?.requiredRoleCodes).toEqual(["warehouse"]);
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
});
