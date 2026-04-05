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

export interface AuthPrincipal {
  userId: string;
  login: string;
  displayName: string;
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
