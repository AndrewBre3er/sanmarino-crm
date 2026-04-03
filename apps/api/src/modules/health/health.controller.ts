import { Controller, Get, Res } from "@nestjs/common";
import { api_app_shell_contract } from "../../contracts/app-shell.contract";
import type { HealthcheckResponse, ReadinessResponse } from "../../common/http/health.contract";

function has_required_infra_env(): boolean {
  return Boolean(process.env.DATABASE_URL) && Boolean(process.env.REDIS_URL);
}

@Controller()
export class HealthController {
  @Get("health")
  check(): HealthcheckResponse {
    return {
      status: "ok",
      service: api_app_shell_contract.service,
      timestamp: new Date().toISOString()
    };
  }

  @Get("ready")
  ready(
    @Res({ passthrough: true }) response: { status: (code: number) => unknown }
  ): ReadinessResponse {
    if (!has_required_infra_env()) {
      response.status(503);
      return {
        status: "not_ready",
        service: api_app_shell_contract.service,
        reason: "DATABASE_URL or REDIS_URL is missing"
      };
    }

    return {
      status: "ok",
      service: api_app_shell_contract.service,
      timestamp: new Date().toISOString()
    };
  }
}
