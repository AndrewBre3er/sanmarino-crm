import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  kpi_live_metric_refresh_global_scope_type,
  kpi_live_metric_refresh_idempotency_scope,
  kpi_live_metric_refresh_outbox_aggregate_type,
  PrismaKpiLiveRefreshPersistenceAdapter
} from "../../src/modules/analytics/kpi-live-refresh.persistence";
import type { PrismaService } from "../../src/prisma/prisma.service";

const refreshed_at = "2026-04-30T10:00:00.000Z";

function build_request_hash(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function build_completed_response() {
  return {
    eventType: "kpi.live_aggregate_refreshed",
    liveMetric: {
      id: "metric_1",
      metricKey: "cash_revenue",
      scopeType: "global",
      scopeId: null,
      metricValue: "123.45",
      metricPayload: null,
      asOf: refreshed_at,
      createdAt: "2026-04-30T10:00:01.000Z",
      updatedAt: "2026-04-30T10:00:02.000Z"
    }
  };
}

function build_live_metric_row() {
  return {
    id: "metric_1",
    metricKey: "cash_revenue",
    scopeType: "global",
    scopeId: null,
    metricValue: "123.45",
    metricPayload: null,
    asOf: new Date(refreshed_at),
    createdAt: new Date("2026-04-30T10:00:01.000Z"),
    updatedAt: new Date("2026-04-30T10:00:02.000Z")
  };
}

function create_prisma_mock() {
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn().mockResolvedValue({ id: "idem_1" });
  const systemIdempotencyRecordUpdate = vi.fn().mockResolvedValue({ id: "idem_1" });
  const liveKpiMetricUpsertRaw = vi.fn().mockResolvedValue([build_live_metric_row()]);
  const systemOutboxRecordCreate = vi.fn().mockResolvedValue({ id: "outbox_1" });

  const transactionClient = {
    systemIdempotencyRecord: {
      findUnique: systemIdempotencyRecordFindUnique,
      create: systemIdempotencyRecordCreate,
      update: systemIdempotencyRecordUpdate
    },
    systemOutboxRecord: {
      create: systemOutboxRecordCreate
    },
    $queryRaw: liveKpiMetricUpsertRaw
  };

  const transaction = vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
    callback(transactionClient)
  );

  const prismaService = {
    $transaction: transaction
  } as unknown as PrismaService;

  return {
    prismaService,
    transaction,
    transactionClient,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate,
    liveKpiMetricUpsertRaw,
    systemOutboxRecordCreate
  };
}

function create_adapter(prismaService: PrismaService) {
  return new PrismaKpiLiveRefreshPersistenceAdapter(prismaService);
}

describe("KPI live refresh persistence adapter", () => {
  it("requires a partial unique index for nullable global live KPI scope", () => {
    const migration = readFileSync(
      path.resolve(
        process.cwd(),
        "prisma/migrations/20260621_stage8e_kpi_live_global_scope_unique/migration.sql"
      ),
      "utf8"
    );

    expect(migration).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "live_kpi_metrics_metric_code_scope_type_global_key"'
    );
    expect(migration).toContain(
      'ON "analytics"."live_kpi_metrics"("metric_code", "scope_type")'
    );
    expect(migration).toContain('WHERE "scope_id" IS NULL');
  });

  it("writes an already-computed global live KPI metric with idempotency and outbox in one transaction", async () => {
    const prisma = create_prisma_mock();
    prisma.systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    const adapter = create_adapter(prisma.prismaService);

    const result = await adapter.writeLiveRefresh({
      metricKey: "cash_revenue",
      period: "2026-04",
      scopeType: kpi_live_metric_refresh_global_scope_type,
      scopeId: null,
      refreshedAt: refreshed_at,
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04",
      metricValue: "123.4500",
      metricPayload: null
    });

    const expectedRequestHash = build_request_hash({
      metricKey: "cash_revenue",
      period: "2026-04",
      scopeType: "global",
      scopeId: null,
      refreshedAt: refreshed_at,
      metricValue: "123.45",
      metricPayload: null
    });

    expect(prisma.transaction).toHaveBeenCalledOnce();
    expect(prisma.systemIdempotencyRecordFindUnique).toHaveBeenCalledWith({
      where: {
        scope_idempotencyKey: {
          scope: kpi_live_metric_refresh_idempotency_scope,
          idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
        }
      },
      select: {
        id: true,
        requestHash: true,
        status: true,
        lockedUntil: true,
        responseBody: true
      }
    });
    expect(prisma.systemIdempotencyRecordCreate).toHaveBeenCalledWith({
      data: {
        scope: kpi_live_metric_refresh_idempotency_scope,
        idempotencyKey: "kpi.refresh.cash_revenue.2026-04",
        requestHash: expectedRequestHash,
        status: "STARTED",
        lockedUntil: expect.any(Date)
      },
      select: {
        id: true
      }
    });
    expect(prisma.liveKpiMetricUpsertRaw).toHaveBeenCalledOnce();
    expect(prisma.systemOutboxRecordCreate).toHaveBeenCalledWith({
      data: {
        eventType: "kpi.live_aggregate_refreshed",
        aggregateType: kpi_live_metric_refresh_outbox_aggregate_type,
        aggregateId: "metric_1",
        payload: {
          metricKey: "cash_revenue",
          period: "2026-04",
          refreshedAt: refreshed_at
        }
      }
    });
    expect(prisma.systemIdempotencyRecordUpdate).toHaveBeenCalledWith({
      where: {
        id: "idem_1"
      },
      data: {
        status: "COMPLETED",
        responseStatusCode: 200,
        responseBody: build_completed_response(),
        lockedUntil: null
      },
      select: {
        id: true
      }
    });
    expect(result).toEqual({
      ...build_completed_response(),
      replayed: false
    });
  });

  it("replays a completed idempotency record without a second live write or outbox event", async () => {
    const prisma = create_prisma_mock();
    const requestHash = build_request_hash({
      metricKey: "cash_revenue",
      period: "2026-04",
      scopeType: "global",
      scopeId: null,
      refreshedAt: refreshed_at,
      metricValue: "123.45",
      metricPayload: null
    });
    prisma.systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_1",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: build_completed_response()
    });
    const adapter = create_adapter(prisma.prismaService);

    const result = await adapter.writeLiveRefresh({
      metricKey: "cash_revenue",
      period: "2026-04",
      scopeType: "global",
      scopeId: null,
      refreshedAt: refreshed_at,
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04",
      metricValue: "123.4500",
      metricPayload: null
    });

    expect(prisma.liveKpiMetricUpsertRaw).not.toHaveBeenCalled();
    expect(prisma.systemOutboxRecordCreate).not.toHaveBeenCalled();
    expect(prisma.systemIdempotencyRecordUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({
      ...build_completed_response(),
      replayed: true
    });
  });

  it("rejects repeated idempotency keys with a different normalized request hash", async () => {
    const prisma = create_prisma_mock();
    prisma.systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_1",
      requestHash: "different_hash",
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: build_completed_response()
    });
    const adapter = create_adapter(prisma.prismaService);

    await expect(
      adapter.writeLiveRefresh({
        metricKey: "cash_revenue",
        period: "2026-04",
        scopeType: "global",
        scopeId: null,
        refreshedAt: refreshed_at,
        idempotencyKey: "kpi.refresh.cash_revenue.2026-04",
        metricValue: "123.4500",
        metricPayload: null
      })
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.liveKpiMetricUpsertRaw).not.toHaveBeenCalled();
    expect(prisma.systemOutboxRecordCreate).not.toHaveBeenCalled();
  });

  it("treats active started and failed idempotency records as terminal conflicts for the same key", async () => {
    const prisma = create_prisma_mock();
    const requestHash = build_request_hash({
      metricKey: "cash_revenue",
      period: "2026-04",
      scopeType: "global",
      scopeId: null,
      refreshedAt: refreshed_at,
      metricValue: "123.45",
      metricPayload: null
    });
    const adapter = create_adapter(prisma.prismaService);
    const command = {
      metricKey: "cash_revenue" as const,
      period: "2026-04",
      scopeType: "global" as const,
      scopeId: null,
      refreshedAt: refreshed_at,
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04",
      metricValue: "123.4500",
      metricPayload: null
    };

    prisma.systemIdempotencyRecordFindUnique.mockResolvedValueOnce({
      id: "idem_1",
      requestHash,
      status: "STARTED",
      lockedUntil: new Date("2099-01-01T00:00:00.000Z"),
      responseBody: null
    });
    await expect(adapter.writeLiveRefresh(command)).rejects.toBeInstanceOf(ConflictException);

    prisma.systemIdempotencyRecordFindUnique.mockResolvedValueOnce({
      id: "idem_1",
      requestHash,
      status: "FAILED",
      lockedUntil: null,
      responseBody: null
    });
    await expect(adapter.writeLiveRefresh(command)).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.liveKpiMetricUpsertRaw).not.toHaveBeenCalled();
    expect(prisma.systemOutboxRecordCreate).not.toHaveBeenCalled();
  });

  it("rejects non-global KPI refresh scopes before opening a transaction", async () => {
    const prisma = create_prisma_mock();
    const adapter = create_adapter(prisma.prismaService);

    await expect(
      adapter.writeLiveRefresh({
        metricKey: "cash_revenue",
        period: "2026-04",
        scopeType: "department" as "global",
        scopeId: "11111111-1111-4111-8111-111111111111" as unknown as null,
        refreshedAt: refreshed_at,
        idempotencyKey: "kpi.refresh.cash_revenue.2026-04",
        metricValue: "123.4500",
        metricPayload: null
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.transaction).not.toHaveBeenCalled();
  });

  it("keeps the persistence adapter isolated from formulas, source domains, snapshots, plans, and notifications", () => {
    const adapter_path = path.resolve(
      process.cwd(),
      "src/modules/analytics/kpi-live-refresh.persistence.ts"
    );
    const adapter = readFileSync(adapter_path, "utf8");

    expect(adapter).toContain('"analytics"."live_kpi_metrics"');
    expect(adapter).not.toContain("snapshot_kpi_metrics");
    expect(adapter).not.toContain("department_plans");
    expect(adapter).not.toContain('FROM "crm"');
    expect(adapter).not.toContain('FROM "orders"');
    expect(adapter).not.toContain('FROM "inventory"');
    expect(adapter).not.toContain('FROM "payments"');
    expect(adapter).not.toContain('FROM "logistics"');
    expect(adapter).not.toContain('FROM "finance"');
    expect(adapter).not.toContain('FROM "reconciliation"');
    expect(adapter).not.toContain("formula");
    expect(adapter).not.toContain("telegram");
    expect(adapter).not.toContain("notification");
  });
});
