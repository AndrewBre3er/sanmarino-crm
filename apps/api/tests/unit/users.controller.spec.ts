import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import { AuthAccessGuard } from "../../src/modules/auth/auth.access.guard";
import type { AuthRoleCode } from "../../src/modules/auth/auth.contract";
import { UsersAdminController } from "../../src/modules/users/users.controller";
import type { UsersAdminService } from "../../src/modules/users/users.service";

function build_service_stub(): UsersAdminService {
  return {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    replaceUserRoles: vi.fn(),
    listRoles: vi.fn(),
    listPermissions: vi.fn()
  } as unknown as UsersAdminService;
}

describe("users admin controller", () => {
  it("enforces admin-only access metadata", () => {
    const metadata = Reflect.getMetadata(auth_access_metadata_key, UsersAdminController) as {
      authenticated?: boolean;
      requiredRoleCodes?: AuthRoleCode[];
    };

    expect(metadata.authenticated).toBe(true);
    expect(metadata.requiredRoleCodes).toEqual(["admin"]);

    const guards = Reflect.getMetadata(GUARDS_METADATA, UsersAdminController) as Array<new () => unknown>;
    expect(guards).toContain(AuthAccessGuard);
  });

  it("delegates list/detail/roles update to service", async () => {
    const service = build_service_stub();
    const controller = new UsersAdminController(service);

    vi.mocked(service.listUsers).mockResolvedValue([{ id: "user-1", email: "admin.bootstrap@local" }] as never);
    vi.mocked(service.getUser).mockResolvedValue({ id: "user-1", email: "admin.bootstrap@local" } as never);
    vi.mocked(service.replaceUserRoles).mockResolvedValue({ id: "user-1", roleCodes: ["admin"] } as never);

    await expect(controller.listUsers()).resolves.toEqual({ data: [{ id: "user-1", email: "admin.bootstrap@local" }] });
    await expect(controller.getUser("user-1")).resolves.toEqual({ data: { id: "user-1", email: "admin.bootstrap@local" } });
    await expect(controller.patchUserRoles("user-1", { roleCodes: ["admin"] })).resolves.toEqual({
      data: { id: "user-1", roleCodes: ["admin"] }
    });
  });

  it("delegates roles and permissions list to service", async () => {
    const service = build_service_stub();
    const controller = new UsersAdminController(service);

    vi.mocked(service.listRoles).mockResolvedValue([{ code: "admin" }] as never);
    vi.mocked(service.listPermissions).mockResolvedValue([{ code: "users.read" }] as never);

    await expect(controller.listRoles()).resolves.toEqual({ data: [{ code: "admin" }] });
    await expect(controller.listPermissions()).resolves.toEqual({ data: [{ code: "users.read" }] });
  });
});