import { Inject, Injectable } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  as_auth_role_code,
  resolve_primary_role,
  sort_role_codes,
  type AuthRoleCode
} from "../auth/auth.contract";

export interface UsersAdminUserView {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  departmentCode: string | null;
  roleCodes: AuthRoleCode[];
  primaryRole: AuthRoleCode | null;
}

export interface UsersAdminRoleView {
  id: string;
  code: AuthRoleCode;
  name: string;
  status: "active" | "inactive";
  departmentCode: string | null;
}

export interface UsersAdminPermissionView {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

function map_record_status(status: RecordStatus): "active" | "inactive" {
  return status === RecordStatus.ACTIVE ? "active" : "inactive";
}

function map_role_codes(
  userRoles: Array<{
    role: {
      code: string;
      status: RecordStatus;
    };
  }>
): AuthRoleCode[] {
  const roleCodes: AuthRoleCode[] = [];

  for (const userRole of userRoles) {
    if (userRole.role.status !== RecordStatus.ACTIVE) {
      continue;
    }

    const roleCode = as_auth_role_code(userRole.role.code);
    if (!roleCode) {
      continue;
    }

    roleCodes.push(roleCode);
  }

  return sort_role_codes(roleCodes);
}

@Injectable()
export class PrismaUsersAdminRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listUsers(): Promise<UsersAdminUserView[]> {
    const users = await this.prismaService.usersUser.findMany({
      orderBy: [{ email: "asc" }],
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        department: {
          select: {
            code: true
          }
        },
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                status: true
              }
            }
          }
        }
      }
    });

    return users.map((user) => {
      const roleCodes = map_role_codes(user.userRoles);
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isActive: user.isActive,
        departmentCode: user.department?.code ?? null,
        roleCodes,
        primaryRole: resolve_primary_role(roleCodes)
      };
    });
  }

  async getUserById(userId: string): Promise<UsersAdminUserView | null> {
    const user = await this.prismaService.usersUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        department: {
          select: {
            code: true
          }
        },
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    const roleCodes = map_role_codes(user.userRoles);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      departmentCode: user.department?.code ?? null,
      roleCodes,
      primaryRole: resolve_primary_role(roleCodes)
    };
  }

  async listRoles(): Promise<UsersAdminRoleView[]> {
    const rows = await this.prismaService.usersRole.findMany({
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        department: {
          select: {
            code: true
          }
        }
      }
    });

    const roles: UsersAdminRoleView[] = [];

    for (const row of rows) {
      const roleCode = as_auth_role_code(row.code);
      if (!roleCode) {
        continue;
      }

      roles.push({
        id: row.id,
        code: roleCode,
        name: row.name,
        status: map_record_status(row.status),
        departmentCode: row.department?.code ?? null
      });
    }

    return roles;
  }

  async listPermissions(): Promise<UsersAdminPermissionView[]> {
    const rows = await this.prismaService.usersPermission.findMany({
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true
      }
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description
    }));
  }

  async findActiveRolesByCodes(roleCodes: readonly AuthRoleCode[]): Promise<UsersAdminRoleView[]> {
    if (roleCodes.length === 0) {
      return [];
    }

    const rows = await this.prismaService.usersRole.findMany({
      where: {
        code: { in: [...roleCodes] },
        status: RecordStatus.ACTIVE
      },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        department: {
          select: {
            code: true
          }
        }
      }
    });

    return rows
      .map((row) => {
        const roleCode = as_auth_role_code(row.code);
        if (!roleCode) {
          return null;
        }

        return {
          id: row.id,
          code: roleCode,
          name: row.name,
          status: map_record_status(row.status),
          departmentCode: row.department?.code ?? null
        } as UsersAdminRoleView;
      })
      .filter((value): value is UsersAdminRoleView => Boolean(value));
  }

  async replaceUserRolesByIds(userId: string, roleIds: readonly string[]): Promise<void> {
    const statements = [
      this.prismaService.usersUserRole.deleteMany({
        where: { userId }
      })
    ];

    if (roleIds.length > 0) {
      statements.push(
        this.prismaService.usersUserRole.createMany({
          data: roleIds.map((roleId) => ({
            userId,
            roleId
          })),
          skipDuplicates: true
        })
      );
    }

    await this.prismaService.$transaction(statements);
  }
}