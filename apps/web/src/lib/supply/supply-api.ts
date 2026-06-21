import "server-only";

import { cookies } from "next/headers";
import { build_auth_api_url } from "../auth/auth-session";
import {
  parse_supplier_request_collection_payload,
  parse_supplier_request_detail_payload,
  type SupplierRequestDetailView,
  type SupplierRequestListView,
  type SupplyPagePagination
} from "./supply-contract";

interface SupplyCollectionResult<TItem> {
  data: TItem[];
  pagination: SupplyPagePagination | null;
  error: string | null;
}

interface SupplyDetailResult<TItem> {
  data: TItem | null;
  error: string | null;
}

interface SupplyFetchResult {
  payload: unknown | null;
  status: number | null;
  error: string | null;
}

async function fetch_supply_payload(pathname: string): Promise<SupplyFetchResult> {
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
      error: "Supply backend is unavailable."
    };
  }
}

function to_backend_error_message(status: number): string {
  if (status === 401) {
    return "Session is not authenticated.";
  }

  if (status === 403) {
    return "Access denied by supply backend policy.";
  }

  if (status === 404) {
    return "Requested supply object was not found.";
  }

  return `Supply backend request failed with status ${status}.`;
}

function invalid_shape_error(resourceName: string): string {
  return `Supply backend response for ${resourceName} has invalid shape.`;
}

export async function fetch_supplier_requests_list(): Promise<
  SupplyCollectionResult<SupplierRequestListView>
> {
  const response = await fetch_supply_payload("/supplier-requests");
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_supplier_request_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /supplier-requests")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_supplier_request_detail(
  supplierRequestId: string
): Promise<SupplyDetailResult<SupplierRequestDetailView>> {
  const response = await fetch_supply_payload(
    `/supplier-requests/${encodeURIComponent(supplierRequestId)}`
  );
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_supplier_request_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /supplier-requests/:supplierRequestId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}
