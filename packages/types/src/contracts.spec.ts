import { describe, expect, it } from "vitest";
import {
  api_error_codes,
  api_error_taxonomy,
  accepted_kpi_metric_key_values,
  accepted_kpi_metric_keys,
  idempotency_header_name,
  idempotency_key_contract,
  is_accepted_kpi_metric_key,
  kpi_live_aggregate_refreshed_event_type,
  kpi_refresh_job_contract,
  kpi_refresh_queue_default_name,
  kpi_refresh_queue_key
} from "./index.js";
import type {
  ApiResponseEnvelope,
  EventEnvelope,
  OutboxRecordContract,
  RequestContextContract
} from "./index.js";

const expected_kpi_metric_keys = [
  "cash_revenue",
  "shipped_amount",
  "gross_profit",
  "net_profit",
  "cash_balance",
  "sales_pipeline_count",
  "sales_pipeline_amount",
  "sales_conversion_by_shipment",
  "cac_paid_channels_first_shipment",
  "inventory_turnover_ratio_month",
  "driver_money_expected",
  "problem_orders_count",
  "supplier_payables_amount"
] as const;

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

  it("exports the accepted KPI metric and refresh boundary contract", () => {
    expect(accepted_kpi_metric_keys).toEqual(expected_kpi_metric_keys);
    expect(accepted_kpi_metric_key_values).toEqual([...expected_kpi_metric_keys]);
    expect(is_accepted_kpi_metric_key("cash_revenue")).toBe(true);
    expect(is_accepted_kpi_metric_key("unsupported_metric")).toBe(false);
    expect(kpi_refresh_queue_key).toBe("kpi");
    expect(kpi_refresh_queue_default_name).toBe("analytics.kpi");
    expect(kpi_refresh_job_contract).toEqual({
      queueKey: "kpi",
      jobName: "kpi.live-aggregate.refresh"
    });
    expect(kpi_live_aggregate_refreshed_event_type).toBe("kpi.live_aggregate_refreshed");
  });
});
