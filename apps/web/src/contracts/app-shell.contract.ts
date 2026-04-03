export const web_app_shell_contract = {
  service: "web",
  runtime: "nextjs",
  health_path: "/api/health",
  readiness_path: "/api/ready",
  version: "0.2.0"
} as const;
