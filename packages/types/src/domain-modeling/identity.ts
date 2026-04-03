export const entity_id_conventions = {
  format: "<entity_prefix>_<opaque_token>",
  separator: "_",
  opaqueTokenMinLength: 8,
  opaqueTokenMaxLength: 64,
  pattern: "^[a-z][a-z0-9_]{1,31}_[A-Za-z0-9]{8,64}$",
  apiExposure: "opaque_string_only"
} as const;

const entity_id_regex = /^[a-z][a-z0-9_]{1,31}_[A-Za-z0-9]{8,64}$/;

export function is_valid_entity_id(value: string): boolean {
  return entity_id_regex.test(value);
}

export function to_entity_id_prefix(entity_name: string): string {
  return entity_name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .replace(/__+/g, "_")
    .toLowerCase();
}

export function build_entity_id_example(entity_name: string): string {
  const prefix = to_entity_id_prefix(entity_name);
  return `${prefix}_01HZYQF9Q2A5S4Q9R7B5C1Q3S2`;
}

export const domain_identity_deferred_todos = {
  globalIdGenerationStrategy: "TODO",
  prefixRegistryGovernance: "TODO"
} as const;

