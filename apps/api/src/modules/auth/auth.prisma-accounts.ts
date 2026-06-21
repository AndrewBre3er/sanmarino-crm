import { Inject, Injectable } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  as_auth_role_code,
  is_optional_role_code,
  resolve_allowed_workspaces,
  resolve_primary_role,
  sort_role_codes,
  type AuthPrincipal,
  type AuthRoleCode
} from "./auth.contract";

interface DbUserRoleRecord {
  role: {
    code: string;
    status: RecordStatus;
    rolePermissions: Array<{
      permission: {
        code: string;
      };
    }>;
  };
}

interface DbAuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  isActive: boolean;
  userRoles: DbUserRoleRecord[];
}

function normalize_login(login: string): string {
  return login.trim().toLowerCase();
}

function timing_safe_equal_hex(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");

  if (expected.length === 0 || expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function verify_password_hash(password: string, storedHash: string): boolean {
  const value = storedHash.trim();
  if (value.length === 0) {
    return false;
  }

  if (value.startsWith("scrypt:")) {
    const [, saltHex, expectedHashHex] = value.split(":");
    if (!saltHex || !expectedHashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(expectedHashHex, "hex");
    if (salt.length === 0 || expected.length === 0) {
      return false;
    }

    try {
      const actual = scryptSync(password, salt, expected.length);
      if (actual.length !== expected.length) {
        return false;
      }

      return timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  if (value.startsWith("sha256:")) {
    const [, expectedHashHex] = value.split(":");
    if (!expectedHashHex) {
      return false;
    }

    const actualHashHex = createHash("sha256").update(password).digest("hex");
    return timing_safe_equal_hex(expectedHashHex, actualHashHex);
  }

  return false;
}

@Injectable()
export class AuthPrismaAccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async verify_credentials(login: string, password: string): Promise<AuthPrincipal | null> {
    const normalizedLogin = normalize_login(login);
    if (normalizedLogin.length === 0) {
      return null;
    }

    const user = await this.find_user_by_email(normalizedLogin);
    if (!user || !user.isActive) {
      return null;
    }

    if (!verify_password_hash(password, user.passwordHash)) {
      return null;
    }

    return this.to_principal(user);
  }

  async get_by_user_id(userId: string): Promise<AuthPrincipal | null> {
    const user = await this.find_user_by_id(userId);
    if (!user || !user.isActive) {
      return null;
    }

    return this.to_principal(user);
  }

  private async find_user_by_email(email: string): Promise<DbAuthUserRecord | null> {
    return this.prisma.usersUser.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,
        isActive: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                status: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  private async find_user_by_id(userId: string): Promise<DbAuthUserRecord | null> {
    return this.prisma.usersUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,
        isActive: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                status: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  private to_principal(user: DbAuthUserRecord): AuthPrincipal | null {
    const roleCodes = sort_role_codes(this.extract_role_codes(user.userRoles));
    const primaryRole = resolve_primary_role(roleCodes);
    if (!primaryRole) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      login: user.email,
      displayName: user.displayName,
      primaryRole,
      roleCodes,
      allowedWorkspaces: resolve_allowed_workspaces(roleCodes),
      permissionCodes: this.extract_permission_codes(user.userRoles),
      roleCode: primaryRole,
      optionalRole: is_optional_role_code(primaryRole)
    };
  }

  private extract_role_codes(userRoles: DbUserRoleRecord[]): AuthRoleCode[] {
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

    return roleCodes;
  }

  private extract_permission_codes(userRoles: DbUserRoleRecord[]): string[] {
    const permissionCodes = new Set<string>();

    for (const userRole of userRoles) {
      if (userRole.role.status !== RecordStatus.ACTIVE) {
        continue;
      }

      for (const rolePermission of userRole.role.rolePermissions) {
        const code = rolePermission.permission.code.trim();
        if (code.length > 0) {
          permissionCodes.add(code);
        }
      }
    }

    return [...permissionCodes].sort((left, right) => left.localeCompare(right));
  }
}
