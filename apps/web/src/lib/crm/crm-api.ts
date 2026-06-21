import "server-only";

import { cookies } from "next/headers";
import { build_auth_api_url } from "../auth/auth-session";
import {
  parse_crm_deal_collection_payload,
  parse_crm_deal_detail_payload,
  parse_crm_lead_collection_payload,
  parse_crm_lead_detail_payload,
  type CrmDealView,
  type CrmLeadView,
  type CrmPagePagination
} from "./crm-contract";

interface CrmCollectionResult<TItem> {
  data: TItem[];
  pagination: CrmPagePagination | null;
  error: string | null;
}

interface CrmDetailResult<TItem> {
  data: TItem | null;
  error: string | null;
}

interface CrmFetchResult {
  payload: unknown | null;
  status: number | null;
  error: string | null;
}

async function fetch_crm_payload(pathname: string): Promise<CrmFetchResult> {
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
      error: "CRM backend is unavailable."
    };
  }
}

function to_backend_error_message(status: number): string {
  if (status === 401) {
    return "Session is not authenticated.";
  }

  if (status === 403) {
    return "Access denied by CRM backend policy.";
  }

  if (status === 404) {
    return "Requested CRM object was not found.";
  }

  return `CRM backend request failed with status ${status}.`;
}

function invalid_shape_error(resourceName: string): string {
  return `CRM backend response for ${resourceName} has invalid shape.`;
}

export async function fetch_crm_leads_list(): Promise<CrmCollectionResult<CrmLeadView>> {
  const response = await fetch_crm_payload("/leads");
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_crm_lead_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /leads")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_crm_lead_detail(leadId: string): Promise<CrmDetailResult<CrmLeadView>> {
  const response = await fetch_crm_payload(`/leads/${encodeURIComponent(leadId)}`);
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_crm_lead_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /leads/:leadId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}

export async function fetch_crm_deals_list(): Promise<CrmCollectionResult<CrmDealView>> {
  const response = await fetch_crm_payload("/deals");
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_crm_deal_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /deals")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_crm_deal_detail(dealId: string): Promise<CrmDetailResult<CrmDealView>> {
  const response = await fetch_crm_payload(`/deals/${encodeURIComponent(dealId)}`);
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_crm_deal_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /deals/:dealId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}
