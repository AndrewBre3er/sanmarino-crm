import { randomUUID } from "node:crypto";
import type { ApiBoundaryAuditContext } from "../audit/audit-context.contract";
import {
  actor_types,
  correlation_id_pattern,
  idempotency_key_pattern,
  request_context_headers,
  request_id_pattern
} from "./request-context.contract";
import type { ActorMetadata, ActorType, ApiShellRequestContext } from "./request-context.types";

export type HeaderBag = Record<string, string | string[] | undefined>;

function normalize_header_name(header_name: string): string {
  return header_name.toLowerCase();
}

function read_header(headers: HeaderBag, header_name: string): string | undefined {
  const value = headers[normalize_header_name(header_name)];
  if (Array.isArray(value)) {
    return value[0];
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalize_id(
  value: string | undefined,
  pattern: RegExp,
  fallback_factory: () => string
): string {
  if (value && pattern.test(value)) {
    return value;
  }

  return fallback_factory();
}

function generate_request_id(prefix: "req" | "corr"): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

function normalize_roles(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed.length > 0 ? parsed : undefined;
}

function normalize_actor_type(value: string | undefined): ActorType {
  if (!value) {
    return "anonymous";
  }

  const normalized = value.trim().toLowerCase();
  if ((actor_types as readonly string[]).includes(normalized)) {
    return normalized as ActorType;
  }

  return "anonymous";
}

export function extract_request_context(headers: HeaderBag): ApiShellRequestContext {
  const request_id = normalize_id(
    read_header(headers, request_context_headers.requestId),
    request_id_pattern,
    () => generate_request_id("req")
  );

  const correlation_id = normalize_id(
    read_header(headers, request_context_headers.correlationId),
    correlation_id_pattern,
    () => request_id
  );

  const idempotency_key_candidate = read_header(headers, request_context_headers.idempotencyKey);
  const idempotency_key =
    idempotency_key_candidate && idempotency_key_pattern.test(idempotency_key_candidate)
      ? idempotency_key_candidate
      : undefined;

  const actor: ActorMetadata = {
    actorType: normalize_actor_type(read_header(headers, request_context_headers.actorType))
  };
  const actor_id = read_header(headers, request_context_headers.actorId);
  if (actor_id) {
    actor.actorId = actor_id;
  }

  const actor_user_id = read_header(headers, request_context_headers.actorUserId);
  if (actor_user_id) {
    actor.userId = actor_user_id;
  }

  const actor_roles = normalize_roles(read_header(headers, request_context_headers.actorRoles));
  if (actor_roles) {
    actor.roleCodes = actor_roles;
  }

  const user_agent = read_header(headers, "User-Agent");
  if (user_agent) {
    actor.userAgent = user_agent;
  }

  const tenant_id = read_header(headers, request_context_headers.tenantId);
  const workspace_id = read_header(headers, request_context_headers.workspaceId);
  const workspace_code = read_header(headers, request_context_headers.workspaceCode);

  const tenant_workspace =
    tenant_id || workspace_id || workspace_code
      ? {
          ...(tenant_id ? { tenantId: tenant_id } : {}),
          ...(workspace_id ? { workspaceId: workspace_id } : {}),
          ...(workspace_code ? { workspaceCode: workspace_code } : {})
        }
      : undefined;

  return {
    requestId: request_id,
    correlationId: correlation_id,
    ...(idempotency_key ? { idempotencyKey: idempotency_key } : {}),
    source: "api",
    actor,
    ...(tenant_workspace ? { tenantWorkspace: tenant_workspace } : {}),
    receivedAt: new Date().toISOString()
  };
}

export function extract_audit_boundary_context(
  request_context: ApiShellRequestContext
): ApiBoundaryAuditContext {
  const audit_context: ApiBoundaryAuditContext = {
    requestId: request_context.requestId,
    correlationId: request_context.correlationId,
    actor: request_context.actor
  };

  if (request_context.tenantWorkspace) {
    audit_context.tenantWorkspace = request_context.tenantWorkspace;
  }

  return audit_context;
}
