import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import { bootstrap_role_codes } from "../../src/modules/auth/auth.contract";
import { SupplierRequestsController } from "../../src/modules/supply/supplier-requests.controller";
import { SuppliersController } from "../../src/modules/supply/suppliers.controller";

describe("supply access baseline", () => {
  it("keeps suppliers and supplier-requests list/detail visible for all roles", () => {
    const controllers = [SuppliersController, SupplierRequestsController];

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

    expect(supplierCreateRequirements?.authenticated).toBe(true);
    expect(supplierCreateRequirements?.requiredRoleCodes).toEqual(["seller", "admin", "ceo"]);
    expect(supplierRequestCreateRequirements?.authenticated).toBe(true);
    expect(supplierRequestCreateRequirements?.requiredRoleCodes).toEqual(["seller"]);
  });
});
