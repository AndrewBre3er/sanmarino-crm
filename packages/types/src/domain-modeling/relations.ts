export const aggregate_boundaries = {
  commercialChain: ["lead", "deal", "order", "fulfillment"],
  deliveryCardinalityRule: "order_to_delivery_task_is_1_to_many",
  returnEntryRule: "return_must_start_from_return_request",
  sourceOfTruthRule: "cross_domain_fact_must_reference_owner_domain"
} as const;

export interface CrossDomainRelationRule {
  sourceModule: string;
  sourceEntity: string;
  targetModule: string;
  targetEntity: string;
  relation: "1:1" | "1:N" | "N:1" | "N:N";
  note: string;
}

export const canonical_cross_domain_relations: CrossDomainRelationRule[] = [
  {
    sourceModule: "crm",
    sourceEntity: "deal",
    targetModule: "orders",
    targetEntity: "order",
    relation: "1:N",
    note: "one deal may produce multiple orders"
  },
  {
    sourceModule: "orders",
    sourceEntity: "order",
    targetModule: "logistics",
    targetEntity: "delivery_task",
    relation: "1:N",
    note: "partial delivery is mandatory baseline"
  },
  {
    sourceModule: "orders",
    sourceEntity: "return_request",
    targetModule: "payments",
    targetEntity: "refund",
    relation: "1:N",
    note: "refund path requires return_request"
  }
];

export const relation_rules_deferred_todos = {
  fullRelationCatalog: "TODO",
  domainLifecycleOwnershipMatrix: "TODO"
} as const;

