export const worker_app_shell_contract = {
  service: "worker",
  runtime: "node-bullmq",
  health_command: "pnpm --filter @sanmarino/worker health",
  readiness_command: "pnpm --filter @sanmarino/worker ready",
  version: "0.2.0"
} as const;
