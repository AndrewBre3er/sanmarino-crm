import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  kpi_live_aggregate_refreshed_event_type,
  type AcceptedKpiMetricKey
} from "@sanmarino/types";
import { PrismaService } from "../../prisma/prisma.service";
import { is_accepted_kpi_metric_key } from "./kpi.metric-keys";

export const kpi_live_metric_refresh_idempotency_scope =
  "kpi.live_metric_refresh" as const;
export const kpi_live_metric_refresh_global_scope_type = "global" as const;
export const kpi_live_metric_refresh_outbox_aggregate_type =
  "analytics.live_kpi_metrics" as const;

export interface KpiLiveRefreshWriteInput {
  metricKey: AcceptedKpiMetricKey;
  period: string;
  scopeType: typeof kpi_live_metric_refresh_global_scope_type;
  scopeId: null;
  refreshedAt: string | Date;
  idempotencyKey: string;
  metricValue: string | number | Prisma.Decimal;
  metricPayload?: Prisma.JsonValue | null;
}

export interface KpiLiveRefreshMetricWriteModel {
  id: string;
  metricKey: AcceptedKpiMetricKey;
  scopeType: typeof kpi_live_metric_refresh_global_scope_type;
  scopeId: null;
  metricValue: string;
  metricPayload: Prisma.JsonValue | null;
  asOf: string;
  createdAt: string;
  updatedAt: string;
}

export interface KpiLiveRefreshWriteResult {
  replayed: boolean;
  eventType: typeof kpi_live_aggregate_refreshed_event_type;
  liveMetric: KpiLiveRefreshMetricWriteModel;
}

interface NormalizedKpiLiveRefreshWriteInput {
  metricKey: AcceptedKpiMetricKey;
  period: string;
  scopeType: typeof kpi_live_metric_refresh_global_scope_type;
  scopeId: null;
  refreshedAt: string;
  refreshedAtDate: Date;
  idempotencyKey: string;
  metricValue: string;
  metricPayload: Prisma.JsonValue | null;
  metricPayloadJson: string | null;
  requestHash: string;
}

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

interface IdempotencyLookupRecord {
  id: string;
  requestHash: string;
  status: string;
  lockedUntil: Date | null;
  responseBody: Prisma.JsonValue | null;
}

interface LiveKpiMetricWriteRow {
  id: string;
  metricKey: string;
  scopeType: string;
  scopeId: string | null;
  metricValue: { toString: () => string } | string | number;
  metricPayload: Prisma.JsonValue | null;
  asOf: Date;
  createdAt: Date;
  updatedAt: Date;
}

type CanonicalJsonObject = Record<string, Prisma.JsonValue>;

@Injectable()
export class PrismaKpiLiveRefreshPersistenceAdapter {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async writeLiveRefresh(input: KpiLiveRefreshWriteInput): Promise<KpiLiveRefreshWriteResult> {
    const normalized = normalize_write_input(input);

    return this.prismaService.$transaction(async (transactionClient) => {
      const idempotency = await acquire_idempotency(transactionClient, normalized);
      if (idempotency.replayed) {
        return replay_completed_result(idempotency.responseBody);
      }

      const liveMetric = await upsert_global_live_metric(transactionClient, normalized);
      const resultBody = build_result_body(liveMetric);

      await transactionClient.systemOutboxRecord.create({
        data: {
          eventType: kpi_live_aggregate_refreshed_event_type,
          aggregateType: kpi_live_metric_refresh_outbox_aggregate_type,
          aggregateId: liveMetric.id,
          payload: {
            metricKey: normalized.metricKey,
            period: normalized.period,
            refreshedAt: normalized.refreshedAt
          }
        }
      });

      await transactionClient.systemIdempotencyRecord.update({
        where: {
          id: idempotency.recordId
        },
        data: {
          status: "COMPLETED",
          responseStatusCode: 200,
          responseBody: resultBody as unknown as Prisma.InputJsonValue,
          lockedUntil: null
        },
        select: {
          id: true
        }
      });

      return {
        ...resultBody,
        replayed: false
      };
    });
  }
}

async function acquire_idempotency(
  transactionClient: Prisma.TransactionClient,
  input: NormalizedKpiLiveRefreshWriteInput
): Promise<AcquiredIdempotencyRecord> {
  const existingRecord = await transactionClient.systemIdempotencyRecord.findUnique({
    where: {
      scope_idempotencyKey: {
        scope: kpi_live_metric_refresh_idempotency_scope,
        idempotencyKey: input.idempotencyKey
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

  if (existingRecord) {
    return resolve_existing_idempotency(existingRecord, input.requestHash);
  }

  const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
  const created = await transactionClient.systemIdempotencyRecord.create({
    data: {
      scope: kpi_live_metric_refresh_idempotency_scope,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      status: "STARTED",
      lockedUntil: lockUntil
    },
    select: {
      id: true
    }
  });

  return {
    recordId: created.id,
    replayed: false,
    responseBody: null
  };
}

function resolve_existing_idempotency(
  existingRecord: IdempotencyLookupRecord,
  requestHash: string
): AcquiredIdempotencyRecord {
  if (existingRecord.requestHash !== requestHash) {
    throw new ConflictException({
      code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
      message: "Idempotency key is already used with a different KPI refresh payload"
    });
  }

  if (existingRecord.status === "COMPLETED") {
    return {
      recordId: existingRecord.id,
      replayed: true,
      responseBody: existingRecord.responseBody
    };
  }

  if (existingRecord.status === "FAILED") {
    throw new ConflictException({
      code: "IDEMPOTENCY_KEY_ALREADY_FAILED",
      message: "KPI refresh idempotency key is already failed; retry requires a new key"
    });
  }

  throw new ConflictException({
    code: "CONFLICT",
    message: "KPI refresh command with this idempotency key is already in progress"
  });
}

async function upsert_global_live_metric(
  transactionClient: Prisma.TransactionClient,
  input: NormalizedKpiLiveRefreshWriteInput
): Promise<KpiLiveRefreshMetricWriteModel> {
  const rows = await transactionClient.$queryRaw<LiveKpiMetricWriteRow[]>`
    INSERT INTO "analytics"."live_kpi_metrics"
      ("metric_code", "scope_type", "scope_id", "metric_value", "metric_payload", "as_of")
    VALUES
      (
        ${input.metricKey},
        ${input.scopeType},
        NULL,
        ${input.metricValue}::numeric,
        ${input.metricPayloadJson}::jsonb,
        ${input.refreshedAtDate}
      )
    ON CONFLICT ("metric_code", "scope_type") WHERE "scope_id" IS NULL
    DO UPDATE SET
      "metric_value" = EXCLUDED."metric_value",
      "metric_payload" = EXCLUDED."metric_payload",
      "as_of" = EXCLUDED."as_of",
      "updated_at" = now()
    RETURNING
      "id",
      "metric_code" AS "metricKey",
      "scope_type" AS "scopeType",
      "scope_id" AS "scopeId",
      "metric_value" AS "metricValue",
      "metric_payload" AS "metricPayload",
      "as_of" AS "asOf",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
  `;

  const [row] = rows;
  if (!row) {
    throw new ConflictException({
      code: "KPI_LIVE_REFRESH_WRITE_FAILED",
      message: "KPI live refresh write did not return a live metric row"
    });
  }

  return map_live_metric_row(row);
}

function replay_completed_result(responseBody: Prisma.JsonValue | null): KpiLiveRefreshWriteResult {
  if (!is_result_body(responseBody)) {
    throw new ConflictException({
      code: "IDEMPOTENCY_RESPONSE_UNAVAILABLE",
      message: "Completed KPI refresh idempotency record does not contain a replayable result"
    });
  }

  return {
    eventType: responseBody.eventType,
    liveMetric: responseBody.liveMetric,
    replayed: true
  };
}

function build_result_body(
  liveMetric: KpiLiveRefreshMetricWriteModel
): Omit<KpiLiveRefreshWriteResult, "replayed"> {
  return {
    eventType: kpi_live_aggregate_refreshed_event_type,
    liveMetric
  };
}

function map_live_metric_row(row: LiveKpiMetricWriteRow): KpiLiveRefreshMetricWriteModel {
  if (
    row.metricKey !== undefined &&
    is_accepted_kpi_metric_key(row.metricKey) &&
    row.scopeType === kpi_live_metric_refresh_global_scope_type &&
    row.scopeId === null
  ) {
    return {
      id: row.id,
      metricKey: row.metricKey,
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      metricValue: row.metricValue.toString(),
      metricPayload: row.metricPayload,
      asOf: row.asOf.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  throw new ConflictException({
    code: "KPI_LIVE_REFRESH_WRITE_FAILED",
    message: "KPI live refresh write returned a row outside the accepted global scope"
  });
}

function normalize_write_input(
  input: KpiLiveRefreshWriteInput
): NormalizedKpiLiveRefreshWriteInput {
  const metricKey = normalize_metric_key(input.metricKey);
  const period = normalize_required_string(input.period, "period");
  const scopeType = normalize_required_string(input.scopeType, "scopeType");
  if (scopeType !== kpi_live_metric_refresh_global_scope_type || input.scopeId !== null) {
    throw new BadRequestException({
      code: "KPI_REFRESH_SCOPE_NOT_ACCEPTED",
      message: "Only global KPI live refresh scope is accepted"
    });
  }

  const refreshedAt = normalize_refreshed_at(input.refreshedAt);
  const metricValue = normalize_metric_value(input.metricValue);
  const metricPayload = normalize_metric_payload(input.metricPayload);
  const requestPayload = {
    metricKey,
    period,
    scopeType,
    scopeId: null,
    refreshedAt,
    metricValue,
    metricPayload
  };

  return {
    metricKey,
    period,
    scopeType,
    scopeId: null,
    refreshedAt,
    refreshedAtDate: new Date(refreshedAt),
    idempotencyKey: normalize_required_string(input.idempotencyKey, "idempotencyKey"),
    metricValue,
    metricPayload,
    metricPayloadJson: metricPayload === null ? null : JSON.stringify(metricPayload),
    requestHash: createHash("sha256").update(JSON.stringify(requestPayload)).digest("hex")
  };
}

function normalize_metric_key(input: unknown): AcceptedKpiMetricKey {
  const metricKey = normalize_required_string(input, "metricKey");
  if (!is_accepted_kpi_metric_key(metricKey)) {
    throw new BadRequestException({
      code: "KPI_METRIC_KEY_NOT_ACCEPTED",
      message: "metricKey is not accepted for KPI live refresh"
    });
  }

  return metricKey;
}

function normalize_required_string(input: unknown, field: string): string {
  if (typeof input !== "string") {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} is required`
    });
  }

  const normalized = input.trim();
  if (!normalized) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} is required`
    });
  }

  return normalized;
}

function normalize_refreshed_at(input: unknown): string {
  const value = input instanceof Date ? input.toISOString() : normalize_required_string(input, "refreshedAt");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "refreshedAt is invalid"
    });
  }

  return parsed.toISOString();
}

function normalize_metric_value(input: unknown): string {
  try {
    const decimal = new Prisma.Decimal(input as string | number | Prisma.Decimal);
    if (!decimal.isFinite()) {
      throw new Error("metricValue is not finite");
    }

    return decimal.toString();
  } catch {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "metricValue must be a finite decimal value"
    });
  }
}

function normalize_metric_payload(input: Prisma.JsonValue | null | undefined): Prisma.JsonValue | null {
  if (input === undefined || input === null) {
    return null;
  }

  return canonicalize_json(input);
}

function canonicalize_json(input: Prisma.JsonValue): Prisma.JsonValue {
  if (Array.isArray(input)) {
    return input.map((item) => canonicalize_json(item));
  }

  if (input && typeof input === "object") {
    const sorted: CanonicalJsonObject = {};
    for (const key of Object.keys(input).sort()) {
      const value = (input as CanonicalJsonObject)[key];
      if (value !== undefined) {
        sorted[key] = canonicalize_json(value);
      }
    }
    return sorted;
  }

  return input;
}

function is_result_body(input: unknown): input is Omit<KpiLiveRefreshWriteResult, "replayed"> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }

  const body = input as Record<string, unknown>;
  if (body.eventType !== kpi_live_aggregate_refreshed_event_type) {
    return false;
  }

  const liveMetric = body.liveMetric;
  if (!liveMetric || typeof liveMetric !== "object" || Array.isArray(liveMetric)) {
    return false;
  }

  const metric = liveMetric as Record<string, unknown>;
  return (
    typeof metric.id === "string" &&
    typeof metric.metricKey === "string" &&
    is_accepted_kpi_metric_key(metric.metricKey) &&
    metric.scopeType === kpi_live_metric_refresh_global_scope_type &&
    metric.scopeId === null &&
    typeof metric.metricValue === "string" &&
    (metric.metricPayload === null || typeof metric.metricPayload !== "undefined") &&
    typeof metric.asOf === "string" &&
    typeof metric.createdAt === "string" &&
    typeof metric.updatedAt === "string"
  );
}
