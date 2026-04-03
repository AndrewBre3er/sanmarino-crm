import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { api_app_shell_contract } from "../../contracts/app-shell.contract";

function has_required_infra_env(): boolean {
  return Boolean(process.env.DATABASE_URL) && Boolean(process.env.REDIS_URL);
}

@Controller()
export class HealthController {
  @Get("health")
  check() {
    return {
      status: "ok",
      service: api_app_shell_contract.service,
      timestamp: new Date().toISOString(),
      version: api_app_shell_contract.version
    };
  }

  @Get("ready")
  ready() {
    if (!has_required_infra_env()) {
      throw new ServiceUnavailableException({
        status: "not_ready",
        service: api_app_shell_contract.service,
        reason: "DATABASE_URL or REDIS_URL is missing"
      });
    }

    return {
      status: "ok",
      service: api_app_shell_contract.service,
      timestamp: new Date().toISOString()
    };
  }
}
