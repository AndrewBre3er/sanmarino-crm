import { describe, expect, it } from "vitest";
import {
  backoffice_shell_routes,
  get_workspace_navigation,
  resolve_workspace_from_path
} from "../src/contracts/backoffice-shell.contract";

describe("backoffice shell contracts", () => {
  it("exposes all required phase-a shell routes", () => {
    const routePaths = backoffice_shell_routes.map(route => route.path);

    expect(routePaths).toContain("/backoffice/leads");
    expect(routePaths).toContain("/backoffice/deals");
    expect(routePaths).toContain("/backoffice/orders");
    expect(routePaths).toContain("/backoffice/payments");
    expect(routePaths).toContain("/backoffice/delivery-tasks");
    expect(routePaths).toContain("/backoffice/return-requests");
    expect(routePaths).toContain("/backoffice/sales");
    expect(routePaths).toContain("/backoffice/logistics");
    expect(routePaths).toContain("/backoffice/finance");
    expect(routePaths).toContain("/backoffice/ceo");
  });

  it("keeps role-aware navigation scoped by workspace", () => {
    const salesNav = get_workspace_navigation("sales").map(item => item.path);
    const logisticsNav = get_workspace_navigation("logistics").map(item => item.path);

    expect(salesNav).toContain("/backoffice/leads");
    expect(salesNav).not.toContain("/backoffice/payments");
    expect(logisticsNav).toContain("/backoffice/delivery-tasks");
    expect(logisticsNav).not.toContain("/backoffice/deals");
  });

  it("resolves default workspace from current path", () => {
    expect(resolve_workspace_from_path("/backoffice/payments")).toBe("finance");
    expect(resolve_workspace_from_path("/backoffice/delivery-tasks")).toBe("logistics");
    expect(resolve_workspace_from_path("/backoffice/unknown")).toBe("sales");
  });
});
