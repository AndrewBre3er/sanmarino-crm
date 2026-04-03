export const web_app_shell_contract = {
  service: "web",
  runtime: "nextjs",
  health_path: "/api/health",
  readiness_path: "/api/ready",
  backoffice_root_path: "/backoffice",
  version: "0.3.0"
} as const;
