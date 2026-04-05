import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  as_auth_role_code,
  resolve_primary_role,
  sort_role_codes,
  type AuthRoleCode
} from "../auth/auth.contract";
import {
  PrismaUsersAdminRepository,
  type UsersAdminPermissionView,
  type UsersAdminRoleView,
  type UsersAdminUserView
} from "./users.repository";

@Injectable()
export class UsersAdminService {
  constructor(
    @Inject(PrismaUsersAdminRepository)
    private readonly usersRepository: PrismaUsersAdminRepository
  ) {}

  async listUsers(): Promise<UsersAdminUserView[]> {
    return this.usersRepository.listUsers();
  }

  async getUser(userId: string): Promise<UsersAdminUserView> {
    const user = await this.usersRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException(`User '${userId}' was not found`);
    }

    return user;
  }

  async listRoles(): Promise<UsersAdminRoleView[]> {
    return this.usersRepository.listRoles();
  }

  async listPermissions(): Promise<UsersAdminPermissionView[]> {
    return this.usersRepository.listPermissions();
  }

  async replaceUserRoles(userId: string, inputRoleCodes: readonly string[]): Promise<UsersAdminUserView> {
    const roleCodes = this.normalizeRoleCodes(inputRoleCodes);

    const user = await this.usersRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException(`User '${userId}' was not found`);
    }

    const activeRoles = await this.usersRepository.findActiveRolesByCodes(roleCodes);

    if (activeRoles.length !== roleCodes.length) {
      const foundCodes = new Set(activeRoles.map((role) => role.code));
      const missingCodes = roleCodes.filter((roleCode) => !foundCodes.has(roleCode));
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `Unknown or inactive role codes: ${missingCodes.join(", ")}`
      });
    }

    const roleIdByCode = new Map(activeRoles.map((role) => [role.code, role.id]));
    const orderedRoleIds = roleCodes.map((roleCode) => {
      const roleId = roleIdByCode.get(roleCode);
      if (!roleId) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: `Role '${roleCode}' is not available for assignment`
        });
      }

      return roleId;
    });

    await this.usersRepository.replaceUserRolesByIds(userId, orderedRoleIds);

    return {
      ...user,
      roleCodes,
      primaryRole: resolve_primary_role(roleCodes)
    };
  }

  private normalizeRoleCodes(roleCodes: readonly string[]): AuthRoleCode[] {
    const normalized: AuthRoleCode[] = [];

    for (const rawRoleCode of roleCodes) {
      const roleCode = as_auth_role_code(rawRoleCode);
      if (!roleCode) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: `Role code '${rawRoleCode}' is not canonical`
        });
      }

      normalized.push(roleCode);
    }

    return sort_role_codes(normalized);
  }
}
