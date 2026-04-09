export const crm_core_entities = [
  "lead",
  "deal",
  "client",
  "contact",
  "client_participant"
] as const;

export const crm_core_status_contract = {
  lead: ["new", "in_processing", "cancelled"] as const,
  deal: ["in_progress", "converted_to_order", "cancelled"] as const
} as const;

export const crm_core_read_side_contract = {
  implementedCollections: ["leads", "deals"] as const,
  deferredCollections: ["clients", "contacts", "client-participants"] as const,
  freezePhase: "crm-step-1-contract-freeze"
} as const;

