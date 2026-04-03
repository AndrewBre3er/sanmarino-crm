export const domain_event_conventions = {
  nameFormat: "<aggregate>.<fact>",
  namePattern: "^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$",
  versionField: "eventVersion",
  initialVersion: 1,
  producerField: "producer",
  occurredAtField: "occurredAt"
} as const;

const event_name_regex = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export function is_valid_domain_event_name(value: string): boolean {
  return event_name_regex.test(value);
}

export function next_event_version(current_version: number): number {
  return current_version + 1;
}

export const domain_event_versioning_rules = {
  nonBreaking: "add_optional_fields_without_version_bump",
  breaking: "remove_or_change_required_fields_requires_version_bump",
  compatibilityWindow: "TODO"
} as const;

