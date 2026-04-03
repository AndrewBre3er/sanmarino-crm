export const api_resource_naming_conventions = {
  collectionStyle: "kebab-case plural",
  idParamStyle: "{resourceId}",
  commandEndpointStyle: "POST /resources/{id}/{command}",
  statusTransitionStyle: "command_based_not_free_status_patch"
} as const;

const collection_name_regex = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*s$/;
const command_name_regex = /^[a-z][a-z0-9-]*$/;

export function is_valid_collection_resource_name(value: string): boolean {
  return collection_name_regex.test(value);
}

export function is_valid_command_name(value: string): boolean {
  return command_name_regex.test(value);
}

export function build_collection_resource_path(collection_name: string): string {
  return `/${collection_name}`;
}

export function build_command_resource_path(
  collection_name: string,
  id_param: string,
  command_name: string
): string {
  return `/${collection_name}/{${id_param}}/${command_name}`;
}

export const api_resource_deferred_todos = {
  versionPrefixPolicy: "TODO",
  bulkCommandNamingPolicy: "TODO"
} as const;

