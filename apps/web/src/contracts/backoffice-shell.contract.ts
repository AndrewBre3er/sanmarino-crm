export const required_auth_role_codes = [
  "admin",
  "seller",
  "warehouse",
  "logistics",
  "finance",
  "ceo"
] as const;

export const optional_auth_role_codes = ["driver", "marketing"] as const;

export const auth_role_codes = [...required_auth_role_codes, ...optional_auth_role_codes] as const;

export type AuthRoleCode = (typeof auth_role_codes)[number];
export type AuthWorkspaceCode = AuthRoleCode;

export const role_russian_labels: Readonly<Record<AuthRoleCode, string>> = {
  admin: "Админ",
  seller: "Продавец",
  warehouse: "Кладовщик",
  logistics: "Логист",
  finance: "Финансист",
  ceo: "Исполнительный директор",
  driver: "Водитель",
  marketing: "Маркетинг"
};

export interface ShellRouteDescriptor {
  key:
    | "admin-workspace"
    | "seller-workspace"
    | "warehouse-workspace"
    | "logistics-workspace"
    | "finance-workspace"
    | "ceo-overview"
    | "driver-workspace"
    | "marketing-workspace"
    | "leads"
    | "deals"
    | "orders"
    | "users"
    | "roles"
    | "supplier-requests"
    | "payments"
    | "delivery-tasks"
    | "return-requests"
    | "integrations"
    | "notifications";
  title: string;
  path: string;
  scope: "workspace" | "entity";
  shellOnly: true;
}

export const backoffice_shell_routes: readonly ShellRouteDescriptor[] = [
  {
    key: "admin-workspace",
    title: "Admin Workspace",
    path: "/backoffice/admin",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "seller-workspace",
    title: "Seller Workspace",
    path: "/backoffice/seller",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "warehouse-workspace",
    title: "Warehouse Workspace",
    path: "/backoffice/warehouse",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "logistics-workspace",
    title: "Logistics Workspace",
    path: "/backoffice/logistics",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "finance-workspace",
    title: "Finance Workspace",
    path: "/backoffice/finance",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "ceo-overview",
    title: "CEO Overview",
    path: "/backoffice/ceo",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "driver-workspace",
    title: "Driver Workspace",
    path: "/backoffice/driver",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "marketing-workspace",
    title: "Marketing Workspace",
    path: "/backoffice/marketing",
    scope: "workspace",
    shellOnly: true
  },
  {
    key: "leads",
    title: "Leads",
    path: "/backoffice/leads",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "deals",
    title: "Deals",
    path: "/backoffice/deals",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "orders",
    title: "Orders",
    path: "/backoffice/orders",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "users",
    title: "Users",
    path: "/backoffice/users",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "roles",
    title: "Roles",
    path: "/backoffice/roles",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "supplier-requests",
    title: "Supplier Requests",
    path: "/backoffice/supplier-requests",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "payments",
    title: "Payments",
    path: "/backoffice/payments",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "delivery-tasks",
    title: "Delivery Tasks",
    path: "/backoffice/delivery-tasks",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "return-requests",
    title: "Return Requests",
    path: "/backoffice/return-requests",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "integrations",
    title: "Integration Inbox",
    path: "/backoffice/integrations",
    scope: "entity",
    shellOnly: true
  },
  {
    key: "notifications",
    title: "Notifications",
    path: "/backoffice/notifications",
    scope: "entity",
    shellOnly: true
  }
] as const;

const role_home_route_key: Readonly<Record<AuthRoleCode, ShellRouteDescriptor["key"]>> = {
  admin: "admin-workspace",
  seller: "seller-workspace",
  warehouse: "warehouse-workspace",
  logistics: "logistics-workspace",
  finance: "finance-workspace",
  ceo: "ceo-overview",
  driver: "driver-workspace",
  marketing: "marketing-workspace"
};

export const role_navigation_contract: Readonly<
  Record<AuthRoleCode, readonly ShellRouteDescriptor["key"][]>
> = {
  admin: ["admin-workspace", "users", "roles", "integrations", "notifications"],
  seller: ["seller-workspace", "leads", "deals", "orders", "supplier-requests", "return-requests"],
  warehouse: ["warehouse-workspace", "orders", "supplier-requests", "return-requests"],
  logistics: ["logistics-workspace", "delivery-tasks", "supplier-requests", "return-requests"],
  finance: ["finance-workspace", "payments", "supplier-requests", "return-requests"],
  ceo: [
    "ceo-overview",
    "leads",
    "deals",
    "orders",
    "supplier-requests",
    "payments",
    "delivery-tasks",
    "return-requests",
    "integrations",
    "notifications"
  ],
  driver: ["driver-workspace", "delivery-tasks", "supplier-requests", "return-requests"],
  marketing: ["marketing-workspace", "leads", "supplier-requests", "return-requests"]
};

const route_by_key = new Map(backoffice_shell_routes.map(route => [route.key, route]));
const route_by_path = new Map(backoffice_shell_routes.map(route => [route.path, route]));
const workspace_by_route_key: Readonly<
  Partial<Record<ShellRouteDescriptor["key"], AuthWorkspaceCode>>
> = {
  "admin-workspace": "admin",
  "seller-workspace": "seller",
  "warehouse-workspace": "warehouse",
  "logistics-workspace": "logistics",
  "finance-workspace": "finance",
  "ceo-overview": "ceo",
  "driver-workspace": "driver",
  "marketing-workspace": "marketing"
};

function normalize_path(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function dedupe_role_codes(roleCodes: readonly AuthRoleCode[]): AuthRoleCode[] {
  return [...new Set(roleCodes)];
}

export function get_role_navigation(roleCode: AuthRoleCode): readonly ShellRouteDescriptor[] {
  return role_navigation_contract[roleCode]
    .map(routeKey => route_by_key.get(routeKey))
    .filter((route): route is ShellRouteDescriptor => Boolean(route));
}

export function get_user_navigation(
  roleCodes: readonly AuthRoleCode[],
  allowedWorkspaces: readonly AuthWorkspaceCode[]
): readonly ShellRouteDescriptor[] {
  const routeKeys = new Set<ShellRouteDescriptor["key"]>();

  for (const roleCode of dedupe_role_codes(roleCodes)) {
    const roleRouteKeys = role_navigation_contract[roleCode] ?? [];
    for (const routeKey of roleRouteKeys) {
      routeKeys.add(routeKey);
    }
  }

  const workspaceCodes = new Set(allowedWorkspaces);
  return backoffice_shell_routes.filter(route => {
    if (!routeKeys.has(route.key)) {
      return false;
    }

    if (route.scope !== "workspace") {
      return true;
    }

    const workspaceCode = workspace_by_route_key[route.key];
    if (!workspaceCode) {
      return false;
    }

    return workspaceCodes.has(workspaceCode);
  });
}

export function can_access_backoffice_path(
  pathname: string,
  roleCodes: readonly AuthRoleCode[],
  allowedWorkspaces: readonly AuthWorkspaceCode[]
): boolean {
  const normalizedPath = normalize_path(pathname);
  const route = route_by_path.get(normalizedPath);
  if (!route) {
    return true;
  }

  return get_user_navigation(roleCodes, allowedWorkspaces).some(item => item.key === route.key);
}

export function resolve_role_home_path(roleCode: AuthRoleCode): string {
  const homeRoute = route_by_key.get(role_home_route_key[roleCode]);
  return homeRoute?.path ?? "/backoffice/seller";
}

export const backoffice_shell_todo_note =
  "TODO: keep frontend navigation role-aware from session and move fine-grained field/action policies to backend RBAC contracts.";
