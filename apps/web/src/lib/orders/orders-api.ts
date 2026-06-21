import "server-only";

import { cookies } from "next/headers";
import { build_auth_api_url } from "../auth/auth-session";
import {
  parse_fulfillment_collection_payload,
  parse_order_collection_payload,
  parse_order_detail_payload,
  type FulfillmentListView,
  type OrderDetailView,
  type OrderListView,
  type OrdersPagePagination
} from "./orders-contract";

interface OrdersCollectionResult<TItem> {
  data: TItem[];
  pagination: OrdersPagePagination | null;
  error: string | null;
}

interface OrdersDetailResult<TItem> {
  data: TItem | null;
  error: string | null;
}

interface OrdersFetchResult {
  payload: unknown | null;
  status: number | null;
  error: string | null;
}

async function fetch_orders_payload(pathname: string): Promise<OrdersFetchResult> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(build_auth_api_url(pathname), {
      method: "GET",
      headers: cookieHeader.length > 0 ? { cookie: cookieHeader } : {},
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        payload: null,
        status: response.status,
        error: to_backend_error_message(response.status)
      };
    }

    const payload = (await response.json()) as unknown;
    return {
      payload,
      status: response.status,
      error: null
    };
  } catch {
    return {
      payload: null,
      status: null,
      error: "Orders backend is unavailable."
    };
  }
}

function to_backend_error_message(status: number): string {
  if (status === 401) {
    return "Session is not authenticated.";
  }

  if (status === 403) {
    return "Access denied by orders backend policy.";
  }

  if (status === 404) {
    return "Requested orders object was not found.";
  }

  return `Orders backend request failed with status ${status}.`;
}

function invalid_shape_error(resourceName: string): string {
  return `Orders backend response for ${resourceName} has invalid shape.`;
}

export async function fetch_orders_list(): Promise<OrdersCollectionResult<OrderListView>> {
  const response = await fetch_orders_payload("/orders");
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_order_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /orders")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_order_detail(orderId: string): Promise<OrdersDetailResult<OrderDetailView>> {
  const response = await fetch_orders_payload(`/orders/${encodeURIComponent(orderId)}`);
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_order_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /orders/:orderId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}

export async function fetch_fulfillments_by_order(
  orderId: string
): Promise<OrdersCollectionResult<FulfillmentListView>> {
  const params = new URLSearchParams({ orderId });
  const response = await fetch_orders_payload(`/fulfillments?${params.toString()}`);
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_fulfillment_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /fulfillments")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}
