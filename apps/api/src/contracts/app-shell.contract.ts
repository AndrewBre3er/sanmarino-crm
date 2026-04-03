export const api_app_shell_contract = {
  service: "api",
  runtime: "nestjs",
  health_path: "/api/health",
  readiness_path: "/api/ready",
  version: "0.10.0"
} as const;
