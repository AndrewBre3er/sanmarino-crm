import { describe, expect, it } from "vitest";
import {
  extract_audit_boundary_context,
  extract_request_context
} from "../../src/common/request-context/request-context.extractor";
import { request_context_headers } from "../../src/common/request-context/request-context.contract";

describe("request context extractor", () => {
  it("extracts request/correlation/idempotency and actor metadata", () => {
    const context = extract_request_context({
      [request_context_headers.requestId.toLowerCase()]: "req_12345678",
      [request_context_headers.correlationId.toLowerCase()]: "corr_12345678",
      [request_context_headers.idempotencyKey.toLowerCase()]: "idem_12345678",
      [request_context_headers.actorType.toLowerCase()]: "service",
      [request_context_headers.actorId.toLowerCase()]: "worker-sync",
      [request_context_headers.actorRoles.toLowerCase()]: "admin,ops",
      [request_context_headers.tenantId.toLowerCase()]: "tenant_a"
    });

    expect(context.requestId).toBe("req_12345678");
    expect(context.correlationId).toBe("corr_12345678");
    expect(context.idempotencyKey).toBe("idem_12345678");
    expect(context.actor.actorType).toBe("service");
    expect(context.actor.actorId).toBe("worker-sync");
    expect(context.actor.roleCodes).toEqual(["admin", "ops"]);
    expect(context.tenantWorkspace?.tenantId).toBe("tenant_a");
  });

  it("generates fallback request id and correlation id for missing headers", () => {
    const context = extract_request_context({});

    expect(context.requestId.startsWith("req_")).toBe(true);
    expect(context.correlationId).toBe(context.requestId);
    expect(context.actor.actorType).toBe("anonymous");
  });

  it("drops invalid idempotency key and maps audit boundary context", () => {
    const context = extract_request_context({
      [request_context_headers.idempotencyKey.toLowerCase()]: "bad key with spaces"
    });
    const audit_context = extract_audit_boundary_context(context);

    expect(context.idempotencyKey).toBeUndefined();
    expect(audit_context.requestId).toBe(context.requestId);
    expect(audit_context.correlationId).toBe(context.correlationId);
    expect(audit_context.actor.actorType).toBe("anonymous");
  });
});

