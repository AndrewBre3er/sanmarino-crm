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
    | "supplier-requests"
    | "payments"
    | "delivery-tasks"
    | "return-requests";
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
  admin: ["admin-workspace", "supplier-requests", "return-requests"],
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
    "return-requests"
  ],
  driver: ["driver-workspace", "delivery-tasks", "supplier-requests", "return-requests"],
  marketing: ["marketing-workspace", "leads", "supplier-requests", "return-requests"]
};

const route_by_key = new Map(backoffice_shell_routes.map(route => [route.key, route]));

export function get_role_navigation(roleCode: AuthRoleCode): readonly ShellRouteDescriptor[] {
  return role_navigation_contract[roleCode]
    .map(routeKey => route_by_key.get(routeKey))
    .filter((route): route is ShellRouteDescriptor => Boolean(route));
}

export function resolve_role_home_path(roleCode: AuthRoleCode): string {
  const homeRoute = route_by_key.get(role_home_route_key[roleCode]);
  return homeRoute?.path ?? "/backoffice/seller";
}

export const backoffice_shell_todo_note =
  "TODO: keep frontend navigation role-aware from session and move fine-grained field/action policies to backend RBAC contracts.";
