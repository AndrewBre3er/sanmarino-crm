export const crm_core_entities = [
  "lead",
  "deal",
  "client",
  "contact",
  "client_participant",
  "deal_follow_up",
  "deal_communication",
  "client_merge_case"
] as const;

export const crm_core_status_contract = {
  lead: ["new", "in_processing", "cancelled"] as const,
  deal: ["in_progress", "converted_to_order", "cancelled"] as const
} as const;

export const crm_core_read_side_contract = {
  implementedCollections: [
    "leads",
    "deals",
    "clients",
    "contacts",
    "client-participants",
    "deal-follow-ups",
    "deal-communications",
    "client-dedup-candidates"
  ] as const,
  deferredCollections: [] as const,
  freezePhase: "delta0-crm-productivity-baseline"
} as const;
