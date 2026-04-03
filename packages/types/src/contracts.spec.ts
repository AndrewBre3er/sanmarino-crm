import { describe, expect, it } from "vitest";
import {
  api_error_codes,
  api_error_taxonomy,
  idempotency_header_name,
  idempotency_key_contract
} from "./index.js";
import type {
  ApiResponseEnvelope,
  EventEnvelope,
  OutboxRecordContract,
  RequestContextContract
} from "./index.js";

describe("platform contract bootstrap", () => {
  it("keeps API error taxonomy aligned with declared codes", () => {
    const taxonomy_codes = Object.keys(api_error_taxonomy);
    expect(taxonomy_codes).toHaveLength(api_error_codes.length);
    expect(taxonomy_codes.sort()).toEqual([...api_error_codes].sort());
  });

  it("keeps idempotency header contract stable", () => {
    expect(idempotency_header_name).toBe("Idempotency-Key");
    expect(idempotency_key_contract.headerName).toBe(idempotency_header_name);
    expect(idempotency_key_contract.maxLength).toBeGreaterThan(
      idempotency_key_contract.minLength
    );
  });

  it("accepts bootstrap-safe response and event envelope shapes", () => {
    const response: ApiResponseEnvelope<{ ok: true }> = {
      data: { ok: true },
      meta: { requestId: "req_123", version: "0.1.0" }
    };

    const context: RequestContextContract = {
      requestId: "req_123",
      correlationId: "corr_123",
      source: "api"
    };

    const event: EventEnvelope<{ requestId: string }> = {
      eventId: "evt_123",
      eventType: "system.bootstrap.ready",
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      producer: "api",
      entityType: "System",
      entityId: "bootstrap",
      payload: { requestId: context.requestId }
    };

    const outbox: OutboxRecordContract<{ requestId: string }> = {
      id: "outbox_123",
      eventType: event.eventType,
      aggregateType: event.entityType,
      aggregateId: event.entityId,
      payload: event.payload,
      status: "pending",
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect("data" in response).toBe(true);
    expect(event.eventId.startsWith("evt_")).toBe(true);
    expect(outbox.status).toBe("pending");
  });
});
