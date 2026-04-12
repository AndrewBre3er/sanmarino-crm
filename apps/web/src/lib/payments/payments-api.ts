import "server-only";

import { cookies } from "next/headers";
import { build_auth_api_url } from "../auth/auth-session";
import {
  parse_payment_collection_payload,
  parse_payment_detail_payload,
  type PaymentDetailView,
  type PaymentListView,
  type PaymentsPagePagination
} from "./payments-contract";

interface PaymentsCollectionResult<TItem> {
  data: TItem[];
  pagination: PaymentsPagePagination | null;
  error: string | null;
}

interface PaymentsDetailResult<TItem> {
  data: TItem | null;
  error: string | null;
}

interface PaymentsFetchResult {
  payload: unknown | null;
  status: number | null;
  error: string | null;
}

async function fetch_payments_payload(pathname: string): Promise<PaymentsFetchResult> {
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
      error: "Payments backend is unavailable."
    };
  }
}

function to_backend_error_message(status: number): string {
  if (status === 401) {
    return "Session is not authenticated.";
  }

  if (status === 403) {
    return "Access denied by payments backend policy.";
  }

  if (status === 404) {
    return "Requested payment was not found.";
  }

  return `Payments backend request failed with status ${status}.`;
}

function invalid_shape_error(resourceName: string): string {
  return `Payments backend response for ${resourceName} has invalid shape.`;
}

export async function fetch_payments_list(): Promise<PaymentsCollectionResult<PaymentListView>> {
  const response = await fetch_payments_payload("/payments");
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_payment_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /payments")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_payment_detail(
  paymentId: string
): Promise<PaymentsDetailResult<PaymentDetailView>> {
  const response = await fetch_payments_payload(`/payments/${encodeURIComponent(paymentId)}`);
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_payment_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /payments/:paymentId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}
