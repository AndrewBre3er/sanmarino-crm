import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthRoleCode } from "../../src/modules/auth/auth.contract";
import { bootstrap_role_codes } from "../../src/modules/auth/auth.contract";
import { AuthAccessGuard } from "../../src/modules/auth/auth.access.guard";
import type { AuthService } from "../../src/modules/auth/auth.service";
import { InventoryMovementsController } from "../../src/modules/supply/inventory-movements.controller";
import { ProductSuppliersController } from "../../src/modules/supply/product-suppliers.controller";
import { PurchaseReceiptsController } from "../../src/modules/supply/purchase-receipts.controller";
import { ReservationsController } from "../../src/modules/supply/reservations.controller";
import { StockLocksController } from "../../src/modules/supply/stock-locks.controller";
import { SupplierRequestsController } from "../../src/modules/supply/supplier-requests.controller";
import { SuppliersController } from "../../src/modules/supply/suppliers.controller";

type ControllerClass = new (...args: never[]) => object;

function make_user(roleCodes: AuthRoleCode[]) {
  const primaryRole = roleCodes[0] ?? "seller";
  return {
    userId: "user-1",
    email: "user-1@local",
    login: "user-1@local",
    displayName: "User 1",
    primaryRole,
    roleCodes,
    allowedWorkspaces: roleCodes,
    permissionCodes: [],
    roleCode: primaryRole,
    optionalRole: false
  };
}

function make_http_context(
  controllerClass: ControllerClass,
  handlerName: string,
  cookieHeader?: string
): ExecutionContext {
  const request = {
    headers: cookieHeader ? { cookie: cookieHeader } : {}
  };

  const handler = (controllerClass.prototype as Record<string, unknown>)[handlerName];
  if (typeof handler !== "function") {
    throw new Error(`Handler '${handlerName}' was not found on controller`);
  }

  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => handler,
    getClass: () => controllerClass
  } as unknown as ExecutionContext;
}

function make_guard(getCurrentUserImpl: ReturnType<typeof vi.fn>): AuthAccessGuard {
  const reflector = new Reflector();
  const authService = {
    get_current_user: getCurrentUserImpl
  } as unknown as AuthService;

  return new AuthAccessGuard(reflector, authService);
}

describe("supply access baseline", () => {
  it("keeps supply list/detail endpoints visible for all roles", () => {
    const controllers = [
      SuppliersController,
      SupplierRequestsController,
      PurchaseReceiptsController,
      StockLocksController,
      ReservationsController,
      ProductSuppliersController,
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

  it("keeps product supplier matrix write role baseline", () => {
    const createRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      ProductSuppliersController.prototype.create
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const patchRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      ProductSuppliersController.prototype.patch
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(createRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
    expect(patchRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
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

  it("returns unauthorized for supply endpoint without auth cookie", async () => {
    const guard = make_guard(vi.fn());
    const context = make_http_context(SuppliersController, "list");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("forbids seller from warehouse-only purchase receipt create", async () => {
    const guard = make_guard(
      vi.fn(async () => ({
        user: make_user(["seller"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );
    const context = make_http_context(
      PurchaseReceiptsController,
      "create",
      "sm_access_token=token-1"
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("forbids warehouse from finance-only supplier request mark-paid action", async () => {
    const guard = make_guard(
      vi.fn(async () => ({
        user: make_user(["warehouse"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );
    const context = make_http_context(
      SupplierRequestsController,
      "markPaid",
      "sm_access_token=token-1"
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("forbids seller from warehouse-only quarantine commands", async () => {
    const guard = make_guard(
      vi.fn(async () => ({
        user: make_user(["seller"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );
    const context = make_http_context(
      InventoryMovementsController,
      "transferToQuarantine",
      "sm_access_token=token-1"
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows finance/ceo on finance-allowed baseline and admin on admin-allowed action", async () => {
    const financeGuard = make_guard(
      vi.fn(async () => ({
        user: make_user(["finance"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );
    const ceoGuard = make_guard(
      vi.fn(async () => ({
        user: make_user(["ceo"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );
    const adminGuard = make_guard(
      vi.fn(async () => ({
        user: make_user(["admin"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );

    await expect(
      financeGuard.canActivate(
        make_http_context(SupplierRequestsController, "markPaid", "sm_access_token=token-1")
      )
    ).resolves.toBe(true);
    await expect(
      ceoGuard.canActivate(
        make_http_context(SupplierRequestsController, "markPaid", "sm_access_token=token-1")
      )
    ).resolves.toBe(true);
    await expect(
      adminGuard.canActivate(
        make_http_context(SuppliersController, "create", "sm_access_token=token-1")
      )
    ).resolves.toBe(true);
  });
});
