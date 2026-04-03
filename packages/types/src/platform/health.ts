export interface HealthcheckResponse {
  status: "ok";
  service: "api" | "web" | "worker";
  timestamp: string;
}

export interface ReadinessResponse {
  status: "ok" | "not_ready";
  service: "api" | "web" | "worker";
  timestamp?: string;
  reason?: string;
}

