import { Injectable } from "@nestjs/common";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { get_env } from "../../config/env";
import {
  optional_bootstrap_role_codes,
  required_bootstrap_role_codes,
  type AuthPrincipal,
  type AuthRoleCode
} from "./auth.contract";

export { required_bootstrap_role_codes, optional_bootstrap_role_codes };

interface BootstrapAccountSeed {
  login: string;
  password: string;
  displayName: string;
  roleCode: AuthRoleCode;
  optionalRole: boolean;
}

interface StoredBootstrapAccount extends AuthPrincipal {
  passwordSaltHex: string;
  passwordHashHex: string;
}

function to_display_name(roleCode: AuthRoleCode): string {
  return `${roleCode} bootstrap user`;
}

function normalize_login(login: string): string {
  return login.trim().toLowerCase();
}

function hash_password(password: string, saltHex: string): string {
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return Buffer.from(derived).toString("hex");
}

function as_auth_role_code(value: string): AuthRoleCode | null {
  const normalized = value.trim().toLowerCase();
  const allRoles = [...required_bootstrap_role_codes, ...optional_bootstrap_role_codes];
  return allRoles.includes(normalized as AuthRoleCode)
    ? (normalized as AuthRoleCode)
    : null;
}

function is_optional_role_code(roleCode: AuthRoleCode): boolean {
  return (optional_bootstrap_role_codes as readonly AuthRoleCode[]).includes(roleCode);
}

function parse_custom_bootstrap_accounts(defaultPassword: string): BootstrapAccountSeed[] | null {
  const raw = get_env().AUTH_BOOTSTRAP_ACCOUNTS_JSON.trim();
  if (raw.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const seeds: BootstrapAccountSeed[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const record = entry as Record<string, unknown>;
      const login = typeof record.login === "string" ? normalize_login(record.login) : "";
      const roleCodeRaw = typeof record.roleCode === "string" ? record.roleCode : "";
      const roleCode = as_auth_role_code(roleCodeRaw);
      if (login.length === 0 || !roleCode) {
        continue;
      }

      const displayName =
        typeof record.displayName === "string" && record.displayName.trim().length > 0
          ? record.displayName.trim()
          : to_display_name(roleCode);
      const password =
        typeof record.password === "string" && record.password.length > 0
          ? record.password
          : defaultPassword;

      seeds.push({
        login,
        password,
        displayName,
        roleCode,
        optionalRole: is_optional_role_code(roleCode)
      });
    }

    return seeds.length > 0 ? seeds : null;
  } catch {
    return null;
  }
}

function default_bootstrap_accounts(defaultPassword: string): BootstrapAccountSeed[] {
  const required = required_bootstrap_role_codes.map(roleCode => ({
    login: `${roleCode}.bootstrap@local`,
    password: defaultPassword,
    displayName: to_display_name(roleCode),
    roleCode,
    optionalRole: false
  }));
  const optional = optional_bootstrap_role_codes.map(roleCode => ({
    login: `${roleCode}.bootstrap@local`,
    password: defaultPassword,
    displayName: to_display_name(roleCode),
    roleCode,
    optionalRole: true
  }));

  return [...required, ...optional];
}

@Injectable()
export class AuthBootstrapAccountsService {
  private readonly byLogin = new Map<string, StoredBootstrapAccount>();
  private readonly byUserId = new Map<string, StoredBootstrapAccount>();

  constructor() {
    const env = get_env();
    const seeds =
      parse_custom_bootstrap_accounts(env.AUTH_BOOTSTRAP_DEFAULT_PASSWORD) ??
      default_bootstrap_accounts(env.AUTH_BOOTSTRAP_DEFAULT_PASSWORD);

    for (const seed of seeds) {
      const saltHex = randomBytes(16).toString("hex");
      const passwordHashHex = hash_password(seed.password, saltHex);
      const stored: StoredBootstrapAccount = {
        userId: randomUUID(),
        login: seed.login,
        displayName: seed.displayName,
        roleCode: seed.roleCode,
        optionalRole: seed.optionalRole,
        passwordSaltHex: saltHex,
        passwordHashHex
      };

      this.byLogin.set(stored.login, stored);
      this.byUserId.set(stored.userId, stored);
    }
  }

  get_all_accounts(): readonly AuthPrincipal[] {
    return [...this.byLogin.values()].map(account => this.to_public(account));
  }

  get_by_user_id(userId: string): AuthPrincipal | null {
    const stored = this.byUserId.get(userId);
    return stored ? this.to_public(stored) : null;
  }

  verify_credentials(login: string, password: string): AuthPrincipal | null {
    const normalized = normalize_login(login);
    const stored = this.byLogin.get(normalized);
    if (!stored) {
      return null;
    }

    const candidateHashHex = hash_password(password, stored.passwordSaltHex);
    const expected = Buffer.from(stored.passwordHashHex, "hex");
    const actual = Buffer.from(candidateHashHex, "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    return this.to_public(stored);
  }

  private to_public(account: StoredBootstrapAccount): AuthPrincipal {
    return {
      userId: account.userId,
      login: account.login,
      displayName: account.displayName,
      roleCode: account.roleCode,
      optionalRole: account.optionalRole
    };
  }
}
