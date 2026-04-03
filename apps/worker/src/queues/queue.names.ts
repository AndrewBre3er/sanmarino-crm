import { worker_queue_contracts } from "./queue.contracts.js";

export function resolve_queue_names(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const contract of worker_queue_contracts) {
    resolved[contract.key] = env[contract.env_key] ?? contract.default_name;
  }

  return resolved;
}
