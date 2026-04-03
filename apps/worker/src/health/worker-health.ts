import { resolve_queue_names } from "../queues/queue.names.js";
import { worker_app_shell_contract } from "../contracts/app-shell.contract.js";

export interface WorkerHealthSnapshot {
  status: "ok" | "not_ready";
  service: "worker";
  timestamp: string;
  reason?: string;
  queues: Record<string, string>;
}

export function get_worker_health_snapshot(env: NodeJS.ProcessEnv = process.env): WorkerHealthSnapshot {
  const queues = resolve_queue_names(env);

  return {
    status: "ok",
    service: worker_app_shell_contract.service,
    timestamp: new Date().toISOString(),
    queues
  };
}

export function get_worker_readiness_snapshot(env: NodeJS.ProcessEnv = process.env): WorkerHealthSnapshot {
  const queues = resolve_queue_names(env);
  const has_redis = Boolean(env.REDIS_URL);
  const has_invalid_queue = Object.values(queues).some((name) => name.trim().length === 0);

  if (!has_redis) {
    return {
      status: "not_ready",
      service: worker_app_shell_contract.service,
      timestamp: new Date().toISOString(),
      reason: "REDIS_URL is missing",
      queues
    };
  }

  if (has_invalid_queue) {
    return {
      status: "not_ready",
      service: worker_app_shell_contract.service,
      timestamp: new Date().toISOString(),
      reason: "One or more queue names are empty",
      queues
    };
  }

  return {
    status: "ok",
    service: worker_app_shell_contract.service,
    timestamp: new Date().toISOString(),
    queues
  };
}
