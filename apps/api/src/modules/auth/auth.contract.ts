export const required_bootstrap_role_codes = [
  "admin",
  "seller",
  "warehouse",
  "logistics",
  "finance",
  "ceo"
] as const;

export const optional_bootstrap_role_codes = ["driver", "marketing"] as const;

export const bootstrap_role_codes = [
  ...required_bootstrap_role_codes,
  ...optional_bootstrap_role_codes
] as const;

export type AuthRoleCode = (typeof bootstrap_role_codes)[number];
export type AuthWorkspaceCode = AuthRoleCode;

const auth_role_priority_order: readonly AuthRoleCode[] = [...bootstrap_role_codes];
const optional_role_code_set = new Set<AuthRoleCode>(optional_bootstrap_role_codes);
const auth_role_code_set = new Set<AuthRoleCode>(bootstrap_role_codes);
const role_priority_index = new Map<AuthRoleCode, number>(
  auth_role_priority_order.map((roleCode, index) => [roleCode, index])
);

const workspace_by_role: Readonly<Record<AuthRoleCode, readonly AuthWorkspaceCode[]>> = {
  admin: ["admin"],
  seller: ["seller"],
  warehouse: ["warehouse"],
  logistics: ["logistics"],
  finance: ["finance"],
  ceo: ["ceo"],
  driver: ["driver"],
  marketing: ["marketing"]
};

export interface AuthPrincipal {
  userId: string;
  email: string;
  login: string;
  displayName: string;
  primaryRole: AuthRoleCode;
  roleCodes: readonly AuthRoleCode[];
  allowedWorkspaces: readonly AuthWorkspaceCode[];
  roleCode: AuthRoleCode;
  optionalRole: boolean;
}

export interface AuthSessionView {
  sessionId: string;
  issuedAt: string;
  refreshExpiresAt: string;
}

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
}

export function as_auth_role_code(value: string): AuthRoleCode | null {
  const normalized = value.trim().toLowerCase();
  if (!auth_role_code_set.has(normalized as AuthRoleCode)) {
    return null;
  }

  return normalized as AuthRoleCode;
}

export function is_optional_role_code(roleCode: AuthRoleCode): boolean {
  return optional_role_code_set.has(roleCode);
}

export function sort_role_codes(roleCodes: readonly AuthRoleCode[]): AuthRoleCode[] {
  const unique = [...new Set(roleCodes)];
  return unique.sort((left, right) => {
    const leftPriority = role_priority_index.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = role_priority_index.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftPriority - rightPriority;
  });
}

export function resolve_primary_role(roleCodes: readonly AuthRoleCode[]): AuthRoleCode | null {
  const ordered = sort_role_codes(roleCodes);
  return ordered[0] ?? null;
}

export function resolve_allowed_workspaces(
  roleCodes: readonly AuthRoleCode[]
): AuthWorkspaceCode[] {
  const orderedRoles = sort_role_codes(roleCodes);
  const collected = orderedRoles.flatMap((roleCode) => workspace_by_role[roleCode]);
  return [...new Set(collected)];
}
