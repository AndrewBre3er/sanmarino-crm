import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { bootstrap_role_codes } from "../../src/modules/auth/auth.contract";
import type { PrismaUsersAdminRepository } from "../../src/modules/users/users.repository";
import { UsersAdminService } from "../../src/modules/users/users.service";

function build_repository_stub(): PrismaUsersAdminRepository {
  return {
    listUsers: vi.fn(),
    getUserById: vi.fn(),
    listRoles: vi.fn(),
    listPermissions: vi.fn(),
    findActiveRolesByCodes: vi.fn(),
    replaceUserRolesByIds: vi.fn()
  } as unknown as PrismaUsersAdminRepository;
}

describe("users admin service", () => {
  it("replaces user roles deterministically and idempotently", async () => {
    const repository = build_repository_stub();
    vi.mocked(repository.getUserById).mockResolvedValue({
      id: "user-1",
      email: "seller.bootstrap@local",
      displayName: "Seller",
      isActive: true,
      departmentCode: "sales",
      roleCodes: ["seller"],
      primaryRole: "seller"
    });

    vi.mocked(repository.findActiveRolesByCodes).mockResolvedValue([
      { id: "role-logistics", code: "logistics", name: "Logistics", status: "active", departmentCode: "logistics" },
      { id: "role-seller", code: "seller", name: "Seller", status: "active", departmentCode: "sales" }
    ]);

    const service = new UsersAdminService(repository);

    const result1 = await service.replaceUserRoles("user-1", ["logistics", "seller", "seller"]);
    const result2 = await service.replaceUserRoles("user-1", ["seller", "logistics"]);

    expect(repository.replaceUserRolesByIds).toHaveBeenNthCalledWith(1, "user-1", [
      "role-seller",
      "role-logistics"
    ]);
    expect(repository.replaceUserRolesByIds).toHaveBeenNthCalledWith(2, "user-1", [
      "role-seller",
      "role-logistics"
    ]);
    expect(result1.roleCodes).toEqual(["seller", "logistics"]);
    expect(result2.roleCodes).toEqual(["seller", "logistics"]);
  });

  it("rejects non-canonical role codes", async () => {
    const repository = build_repository_stub();
    const service = new UsersAdminService(repository);

    await expect(service.replaceUserRoles("user-1", ["super_admin"])).rejects.toBeInstanceOf(
      BadRequestException
    );

    expect(repository.findActiveRolesByCodes).not.toHaveBeenCalled();
  });

  it("rejects unknown/inactive role assignments", async () => {
    const repository = build_repository_stub();
    vi.mocked(repository.getUserById).mockResolvedValue({
      id: "user-1",
      email: "seller.bootstrap@local",
      displayName: "Seller",
      isActive: true,
      departmentCode: "sales",
      roleCodes: ["seller"],
      primaryRole: "seller"
    });
    vi.mocked(repository.findActiveRolesByCodes).mockResolvedValue([]);

    const service = new UsersAdminService(repository);

    await expect(service.replaceUserRoles("user-1", ["seller"])).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("returns not found when user is missing", async () => {
    const repository = build_repository_stub();
    vi.mocked(repository.getUserById).mockResolvedValue(null);

    const service = new UsersAdminService(repository);

    await expect(service.getUser("missing-user")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("uses canonical role universe for validation", () => {
    expect(bootstrap_role_codes).toEqual([
      "admin",
      "seller",
      "warehouse",
      "logistics",
      "finance",
      "ceo",
      "driver",
      "marketing"
    ]);
  });
});
