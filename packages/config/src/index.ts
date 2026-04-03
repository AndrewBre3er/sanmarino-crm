export const config_package_name = "@sanmarino/config";

export const env_contract_keys = {
  global: ["NODE_ENV", "TZ"],
  web: ["WEB_HOST", "WEB_PORT", "NEXT_PUBLIC_API_BASE_URL"],
  api: ["API_HOST", "API_PORT", "DATABASE_URL", "REDIS_URL"],
  worker: ["REDIS_URL", "WORKER_OUTBOX_QUEUE", "WORKER_KPI_QUEUE"]
} as const;
