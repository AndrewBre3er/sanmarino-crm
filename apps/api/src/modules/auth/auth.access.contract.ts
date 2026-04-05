import type { AuthRoleCode } from "./auth.contract";

export const auth_access_metadata_key = "auth:access";

export interface AuthAccessRequirements {
  authenticated?: boolean;
  requiredRoleCodes?: readonly AuthRoleCode[];
  requiredPermissionCodes?: readonly string[];
}

export interface ResolvedAuthAccessRequirements {
  requireAuthenticated: boolean;
  requiredRoleCodes: readonly AuthRoleCode[];
  requiredPermissionCodes: readonly string[];
}

function normalize_permission_code(permissionCode: string): string | null {
  const normalized = permissionCode.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolve_auth_access_requirements(
  requirements?: AuthAccessRequirements
): ResolvedAuthAccessRequirements {
  const requiredRoleCodes = [...new Set(requirements?.requiredRoleCodes ?? [])];
  const requiredPermissionCodes = [
    ...new Set(
      (requirements?.requiredPermissionCodes ?? [])
        .map(normalize_permission_code)
        .filter((value): value is string => Boolean(value))
    )
  ];

  return {
    requireAuthenticated:
      Boolean(requirements?.authenticated) ||
      requiredRoleCodes.length > 0 ||
      requiredPermissionCodes.length > 0,
    requiredRoleCodes,
    requiredPermissionCodes
  };
}
