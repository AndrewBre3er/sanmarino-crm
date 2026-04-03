export const canonical_domain_modules = [
  "crm",
  "orders",
  "inventory",
  "payments",
  "logistics",
  "finance",
  "analytics",
  "users",
  "audit",
  "reconciliation",
  "system"
] as const;

export type CanonicalDomainModule = (typeof canonical_domain_modules)[number];

export const domain_module_boundaries = {
  sourceOfTruthByModule: {
    crm: "commercial context",
    orders: "order execution lifecycle",
    inventory: "stock facts",
    payments: "money facts",
    logistics: "delivery facts",
    finance: "financial reflection",
    analytics: "derived metrics",
    users: "identity/access model",
    audit: "audit trail",
    reconciliation: "cross-domain checks",
    system: "infrastructure records"
  },
  rules: [
    "no_cross_module_authority_override",
    "no_hidden_domain_shortcuts",
    "source_of_truth_must_remain_explicit"
  ]
} as const;

export const module_naming_aliases = {
  kpi: "analytics"
} as const;

export function is_canonical_domain_module(value: string): value is CanonicalDomainModule {
  return (canonical_domain_modules as readonly string[]).includes(value);
}

export const domain_module_deferred_todos = {
  exactCodeOwnersByModule: "TODO",
  moduleReviewChecklistAutomation: "TODO"
} as const;

