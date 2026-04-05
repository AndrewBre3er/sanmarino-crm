import { afterEach, describe, expect, it, vi } from "vitest";
import { reset_env_cache_for_tests } from "../../src/config/env";
import {
  AuthBootstrapAccountsService,
  required_bootstrap_role_codes
} from "../../src/modules/auth/auth.bootstrap-accounts";

describe("auth bootstrap accounts", () => {
  afterEach(() => {
    reset_env_cache_for_tests();
    vi.unstubAllEnvs();
  });

  it("includes required role accounts in default bootstrap strategy", () => {
    vi.stubEnv("AUTH_BOOTSTRAP_DEFAULT_PASSWORD", "change-me");
    const accountsService = new AuthBootstrapAccountsService();
    const accounts = accountsService.get_all_accounts();
    const roleCodes = new Set(accounts.map(account => account.roleCode));

    for (const roleCode of required_bootstrap_role_codes) {
      expect(roleCodes.has(roleCode)).toBe(true);
    }
  });

  it("allows credential verification for a required role account", () => {
    vi.stubEnv("AUTH_BOOTSTRAP_DEFAULT_PASSWORD", "change-me");
    const accountsService = new AuthBootstrapAccountsService();

    const account = accountsService.verify_credentials("admin.bootstrap@local", "change-me");

    expect(account).not.toBeNull();
    expect(account?.roleCode).toBe("admin");
  });
});
