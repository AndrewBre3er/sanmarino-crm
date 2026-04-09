import { describe, expect, it } from "vitest";
import {
  backoffice_shell_routes,
  can_access_backoffice_path,
  get_user_navigation,
  required_auth_role_codes,
  resolve_role_home_path,
  role_russian_labels
} from "../src/contracts/backoffice-shell.contract";

describe("backoffice shell contracts", () => {
  it("exposes all role-home and phase-a shell routes", () => {
    const routePaths = backoffice_shell_routes.map(route => route.path);

    expect(routePaths).toContain("/backoffice/admin");
    expect(routePaths).toContain("/backoffice/leads");
    expect(routePaths).toContain("/backoffice/deals");
    expect(routePaths).toContain("/backoffice/orders");
    expect(routePaths).toContain("/backoffice/users");
    expect(routePaths).toContain("/backoffice/roles");
    expect(routePaths).toContain("/backoffice/supplier-requests");
    expect(routePaths).toContain("/backoffice/payments");
    expect(routePaths).toContain("/backoffice/delivery-tasks");
    expect(routePaths).toContain("/backoffice/return-requests");
    expect(routePaths).toContain("/backoffice/seller");
    expect(routePaths).toContain("/backoffice/warehouse");
    expect(routePaths).toContain("/backoffice/logistics");
    expect(routePaths).toContain("/backoffice/finance");
    expect(routePaths).toContain("/backoffice/ceo");
    expect(routePaths).toContain("/backoffice/driver");
    expect(routePaths).toContain("/backoffice/marketing");
  });

  it("maps each required auth role to a dedicated role home", () => {
    const routePaths = new Set(backoffice_shell_routes.map(route => route.path));
    const roleHomes = required_auth_role_codes.map(resolve_role_home_path);

    for (const homePath of roleHomes) {
      expect(routePaths.has(homePath)).toBe(true);
    }
  });

  it("exposes russian labels for required roles", () => {
    for (const roleCode of required_auth_role_codes) {
      const label = role_russian_labels[roleCode];
      expect(label).toBeTypeOf("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("builds navigation from all assigned roles", () => {
    const sellerFinanceNav = get_user_navigation(["seller", "finance"], ["seller", "finance"]).map(
      item => item.path
    );
    const logisticsNav = get_user_navigation(["logistics"], ["logistics"]).map(item => item.path);
    const financeNav = get_user_navigation(["finance"], ["finance"]).map(item => item.path);
    const sellerNav = get_user_navigation(["seller"], ["seller"]).map(item => item.path);
    const adminNav = get_user_navigation(["admin"], ["admin"]).map(item => item.path);

    expect(sellerFinanceNav).toContain("/backoffice/leads");
    expect(sellerFinanceNav).toContain("/backoffice/payments");
    expect(sellerNav).toContain("/backoffice/leads");
    expect(sellerNav).toContain("/backoffice/supplier-requests");
    expect(sellerNav).toContain("/backoffice/return-requests");
    expect(sellerNav).not.toContain("/backoffice/payments");
    expect(logisticsNav).toContain("/backoffice/supplier-requests");
    expect(logisticsNav).toContain("/backoffice/delivery-tasks");
    expect(logisticsNav).not.toContain("/backoffice/deals");
    expect(financeNav).toContain("/backoffice/supplier-requests");
    expect(financeNav).toContain("/backoffice/return-requests");
    expect(financeNav).toContain("/backoffice/payments");
    expect(financeNav).not.toContain("/backoffice/leads");
    expect(adminNav).toContain("/backoffice/users");
    expect(adminNav).toContain("/backoffice/roles");
    expect(sellerNav).not.toContain("/backoffice/users");
    expect(sellerNav).not.toContain("/backoffice/roles");
  });

  it("denies direct admin paths for non-admin users", () => {
    expect(can_access_backoffice_path("/backoffice/users", ["admin"], ["admin"])).toBe(true);
    expect(can_access_backoffice_path("/backoffice/roles", ["admin"], ["admin"])).toBe(true);
    expect(can_access_backoffice_path("/backoffice/users", ["seller"], ["seller"])).toBe(false);
    expect(can_access_backoffice_path("/backoffice/roles", ["seller"], ["seller"])).toBe(false);
  });
});
