import { describe, expect, it } from "vitest";
import { normalize_success_response } from "../../src/common/http/api-response-envelope.interceptor";
import type { RequestWithShellContext } from "../../src/common/request-context/request-context.request";

describe("api response envelope interceptor helpers", () => {
  it("wraps plain payload into {data, meta}", () => {
    const request = {
      shellContext: {
        requestId: "req_12345678",
        correlationId: "corr_12345678",
        source: "api",
        actor: { actorType: "anonymous" },
        receivedAt: new Date().toISOString()
      }
    } as RequestWithShellContext;

    const normalized = normalize_success_response({ ok: true }, request);
    expect(normalized.data).toEqual({ ok: true });
    expect(normalized.meta?.requestId).toBe("req_12345678");
    expect(normalized.meta?.correlationId).toBe("corr_12345678");
  });

  it("merges meta into already-wrapped envelope", () => {
    const request = {
      shellContext: {
        requestId: "req_12345678",
        correlationId: "corr_12345678",
        source: "api",
        actor: { actorType: "anonymous" },
        receivedAt: new Date().toISOString()
      }
    } as RequestWithShellContext;

    const normalized = normalize_success_response(
      {
        data: { ok: true },
        meta: { custom: "value" }
      },
      request
    );

    expect(normalized.data).toEqual({ ok: true });
    expect(normalized.meta?.custom).toBe("value");
    expect(normalized.meta?.requestId).toBe("req_12345678");
  });
});

