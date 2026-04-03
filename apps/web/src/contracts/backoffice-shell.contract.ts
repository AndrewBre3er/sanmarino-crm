export const workspace_codes = ["sales", "logistics", "finance", "ceo"] as const;

export type WorkspaceCode = (typeof workspace_codes)[number];

export interface WorkspaceDescriptor {
  code: WorkspaceCode;
  title: string;
  subtitle: string;
  homePath: string;
}

export interface ShellRouteDescriptor {
  key:
    | "sales-workspace"
    | "logistics-workspace"
    | "finance-workspace"
    | "ceo-overview"
    | "leads"
    | "deals"
    | "orders"
    | "payments"
    | "delivery-tasks"
    | "return-requests";
  title: string;
  path: string;
  scope: "workspace" | "entity";
  defaultWorkspace: WorkspaceCode;
  shellOnly: true;
}

export const workspace_descriptors: Readonly<Record<WorkspaceCode, WorkspaceDescriptor>> = {
  sales: {
    code: "sales",
    title: "Sales Workspace",
    subtitle: "Lead-to-order operational shell",
    homePath: "/backoffice/sales"
  },
  logistics: {
    code: "logistics",
    title: "Logistics Workspace",
    subtitle: "Delivery planning and task execution shell",
    homePath: "/backoffice/logistics"
  },
  finance: {
    code: "finance",
    title: "Finance Workspace",
    subtitle: "Payments and reconciliation shell",
    homePath: "/backoffice/finance"
  },
  ceo: {
    code: "ceo",
    title: "CEO Overview",
    subtitle: "Cross-domain oversight shell",
    homePath: "/backoffice/ceo"
  }
};

export const backoffice_shell_routes: readonly ShellRouteDescriptor[] = [
  {
    key: "sales-workspace",
    title: "Sales Workspace",
    path: "/backoffice/sales",
    scope: "workspace",
    defaultWorkspace: "sales",
    shellOnly: true
  },
  {
    key: "logistics-workspace",
    title: "Logistics Workspace",
    path: "/backoffice/logistics",
    scope: "workspace",
    defaultWorkspace: "logistics",
    shellOnly: true
  },
  {
    key: "finance-workspace",
    title: "Finance Workspace",
    path: "/backoffice/finance",
    scope: "workspace",
    defaultWorkspace: "finance",
    shellOnly: true
  },
  {
    key: "ceo-overview",
    title: "CEO Overview",
    path: "/backoffice/ceo",
    scope: "workspace",
    defaultWorkspace: "ceo",
    shellOnly: true
  },
  {
    key: "leads",
    title: "Leads",
    path: "/backoffice/leads",
    scope: "entity",
    defaultWorkspace: "sales",
    shellOnly: true
  },
  {
    key: "deals",
    title: "Deals",
    path: "/backoffice/deals",
    scope: "entity",
    defaultWorkspace: "sales",
    shellOnly: true
  },
  {
    key: "orders",
    title: "Orders",
    path: "/backoffice/orders",
    scope: "entity",
    defaultWorkspace: "sales",
    shellOnly: true
  },
  {
    key: "payments",
    title: "Payments",
    path: "/backoffice/payments",
    scope: "entity",
    defaultWorkspace: "finance",
    shellOnly: true
  },
  {
    key: "delivery-tasks",
    title: "Delivery Tasks",
    path: "/backoffice/delivery-tasks",
    scope: "entity",
    defaultWorkspace: "logistics",
    shellOnly: true
  },
  {
    key: "return-requests",
    title: "Return Requests",
    path: "/backoffice/return-requests",
    scope: "entity",
    defaultWorkspace: "sales",
    shellOnly: true
  }
] as const;

export const workspace_navigation_contract: Readonly<
  Record<WorkspaceCode, readonly ShellRouteDescriptor["key"][]>
> = {
  sales: ["sales-workspace", "leads", "deals", "orders", "return-requests"],
  logistics: ["logistics-workspace", "delivery-tasks"],
  finance: ["finance-workspace", "payments"],
  ceo: [
    "ceo-overview",
    "leads",
    "deals",
    "orders",
    "payments",
    "delivery-tasks",
    "return-requests"
  ]
};

const route_by_key = new Map(backoffice_shell_routes.map(route => [route.key, route]));

export function get_workspace_navigation(workspace: WorkspaceCode): readonly ShellRouteDescriptor[] {
  return workspace_navigation_contract[workspace]
    .map(routeKey => route_by_key.get(routeKey))
    .filter((route): route is ShellRouteDescriptor => Boolean(route));
}

export function resolve_workspace_from_path(pathname: string): WorkspaceCode {
  const normalizedPath = pathname.toLowerCase();
  const exactWorkspace = backoffice_shell_routes.find(
    route => route.scope === "workspace" && route.path === normalizedPath
  );

  if (exactWorkspace) {
    return exactWorkspace.defaultWorkspace;
  }

  const entityRoute = backoffice_shell_routes.find(
    route => route.scope === "entity" && route.path === normalizedPath
  );

  return entityRoute?.defaultWorkspace ?? "sales";
}

export const backoffice_shell_todo_note =
  "TODO: replace shell-only navigation context with backend-driven RBAC menu once auth/RBAC contracts are wired.";
