import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  DealReadModel,
  DeliveryTaskReadModel,
  LeadReadModel,
  OrderDetailReadModel,
  OrderReadModel,
  PaymentReadModel,
  ReadEntityQuery,
  ReadEntityResourcePath,
  ReturnRequestReadModel
} from "../types/read-api";

const DEFAULT_API_BASE_URL = "http://localhost:4000/api";

export const read_side_ui_deferred_todos = {
  mutationEndpoints: "TODO",
  workflowActionButtons: "TODO",
  authFlow: "TODO",
  rbacEnforcement: "TODO"
} as const;

export function resolve_read_api_base_url(
  env_base_url: string | undefined = process.env.NEXT_PUBLIC_API_BASE_URL
): string {
  const normalized = (env_base_url ?? "").trim();
  const resolved = normalized.length > 0 ? normalized : DEFAULT_API_BASE_URL;
  return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
}

function build_query_string(query: ReadEntityQuery = {}): string {
  const params = new URLSearchParams();

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.status && query.status.length > 0) {
    params.set("status", query.status.join(","));
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortDirection) {
    params.set("sortDirection", query.sortDirection);
  }

  if (query.includeDeleted) {
    params.set("includeDeleted", "true");
  }

  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

export function build_read_collection_url(
  resource_path: ReadEntityResourcePath,
  query: ReadEntityQuery = {},
  api_base_url?: string
): string {
  const base_url = resolve_read_api_base_url(api_base_url);
  return `${base_url}/${resource_path}${build_query_string(query)}`;
}

export function build_read_detail_url(
  resource_path: ReadEntityResourcePath,
  entity_id: string,
  api_base_url?: string
): string {
  const base_url = resolve_read_api_base_url(api_base_url);
  return `${base_url}/${resource_path}/${encodeURIComponent(entity_id)}`;
}

function to_error_message(
  payload: unknown,
  fallback_message: string
): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const envelope = payload as ApiErrorEnvelope;
    const message = envelope.error?.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback_message;
}

async function read_json_payload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request_read<TData>(url: string): Promise<ApiSuccessEnvelope<TData>> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const payload = await read_json_payload(response);
  if (!response.ok) {
    const fallback = `Read request failed with status ${response.status}`;
    throw new Error(to_error_message(payload, fallback));
  }

  return payload as ApiSuccessEnvelope<TData>;
}

export function fetch_leads_collection(query: ReadEntityQuery = {}) {
  return request_read<LeadReadModel[]>(build_read_collection_url("leads", query));
}

export function fetch_lead_detail(lead_id: string) {
  return request_read<LeadReadModel>(build_read_detail_url("leads", lead_id));
}

export function fetch_deals_collection(query: ReadEntityQuery = {}) {
  return request_read<DealReadModel[]>(build_read_collection_url("deals", query));
}

export function fetch_deal_detail(deal_id: string) {
  return request_read<DealReadModel>(build_read_detail_url("deals", deal_id));
}

export function fetch_orders_collection(query: ReadEntityQuery = {}) {
  return request_read<OrderReadModel[]>(build_read_collection_url("orders", query));
}

export function fetch_order_detail(order_id: string) {
  return request_read<OrderDetailReadModel>(build_read_detail_url("orders", order_id));
}

export function fetch_payments_collection(query: ReadEntityQuery = {}) {
  return request_read<PaymentReadModel[]>(build_read_collection_url("payments", query));
}

export function fetch_payment_detail(payment_id: string) {
  return request_read<PaymentReadModel>(build_read_detail_url("payments", payment_id));
}

export function fetch_delivery_tasks_collection(query: ReadEntityQuery = {}) {
  return request_read<DeliveryTaskReadModel[]>(
    build_read_collection_url("delivery-tasks", query)
  );
}

export function fetch_delivery_task_detail(task_id: string) {
  return request_read<DeliveryTaskReadModel>(
    build_read_detail_url("delivery-tasks", task_id)
  );
}

export function fetch_return_requests_collection(query: ReadEntityQuery = {}) {
  return request_read<ReturnRequestReadModel[]>(
    build_read_collection_url("return-requests", query)
  );
}

export function fetch_return_request_detail(return_request_id: string) {
  return request_read<ReturnRequestReadModel>(
    build_read_detail_url("return-requests", return_request_id)
  );
}
