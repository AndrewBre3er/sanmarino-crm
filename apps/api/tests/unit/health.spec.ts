import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthController } from "../../src/modules/health/health.controller";

describe("health controller shell contracts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns normalized health response shape", () => {
    const controller = new HealthController();
    const result = controller.check();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("api");
    expect(typeof result.timestamp).toBe("string");
    expect("reason" in result).toBe(false);
  });

  it("returns ready contract when infra env is present", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");

    const controller = new HealthController();
    const response = {
      status: vi.fn()
    };

    const result = controller.ready(response);

    expect(result.status).toBe("ok");
    expect(result.service).toBe("api");
    expect(typeof result.timestamp).toBe("string");
    expect(response.status).not.toHaveBeenCalled();
  });

  it("returns not_ready contract and 503 when infra env is missing", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REDIS_URL", "");

    const controller = new HealthController();
    const response = {
      status: vi.fn()
    };

    const result = controller.ready(response);

    expect(result).toEqual({
      status: "not_ready",
      service: "api",
      reason: "DATABASE_URL or REDIS_URL is missing"
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
