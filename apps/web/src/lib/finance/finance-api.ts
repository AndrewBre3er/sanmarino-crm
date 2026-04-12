import "server-only";

import { cookies } from "next/headers";
import { build_auth_api_url } from "../auth/auth-session";
import {
  parse_expense_collection_payload,
  parse_expense_detail_payload,
  parse_finance_entry_collection_payload,
  parse_finance_entry_detail_payload,
  parse_marketing_expense_collection_payload,
  parse_marketing_expense_detail_payload,
  type ExpenseType,
  type ExpenseView,
  type FinanceEntryType,
  type FinanceEntryView,
  type FinancePagePagination,
  type MarketingExpenseView
} from "./finance-contract";

interface FinanceCollectionResult<TItem> {
  data: TItem[];
  pagination: FinancePagePagination | null;
  error: string | null;
}

interface FinanceDetailResult<TItem> {
  data: TItem | null;
  error: string | null;
}

interface FinanceFetchResult {
  payload: unknown | null;
  status: number | null;
  error: string | null;
}

interface FinanceEntriesListFilters {
  entryType?: FinanceEntryType;
  orderId?: string;
  paymentId?: string;
}

interface ExpensesListFilters {
  expenseType?: ExpenseType;
  relatedOrderId?: string;
}

interface MarketingExpensesListFilters {
  source?: string;
}

async function fetch_finance_payload(pathname: string): Promise<FinanceFetchResult> {
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
      error: "Finance backend is unavailable."
    };
  }
}

function to_backend_error_message(status: number): string {
  if (status === 401) {
    return "Session is not authenticated.";
  }

  if (status === 403) {
    return "Access denied by finance backend policy.";
  }

  if (status === 404) {
    return "Requested finance object was not found.";
  }

  return `Finance backend request failed with status ${status}.`;
}

function invalid_shape_error(resourceName: string): string {
  return `Finance backend response for ${resourceName} has invalid shape.`;
}

function append_query_value(searchParams: URLSearchParams, key: string, value: string | undefined): void {
  if (!value) {
    return;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return;
  }

  searchParams.set(key, normalized);
}

export async function fetch_finance_entries_list(
  filters?: FinanceEntriesListFilters
): Promise<FinanceCollectionResult<FinanceEntryView>> {
  const searchParams = new URLSearchParams();
  append_query_value(searchParams, "entryType", filters?.entryType);
  append_query_value(searchParams, "orderId", filters?.orderId);
  append_query_value(searchParams, "paymentId", filters?.paymentId);
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  const response = await fetch_finance_payload(`/finance-entries${query}`);
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_finance_entry_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /finance-entries")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_finance_entry_detail(
  financeEntryId: string
): Promise<FinanceDetailResult<FinanceEntryView>> {
  const response = await fetch_finance_payload(
    `/finance-entries/${encodeURIComponent(financeEntryId)}`
  );
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_finance_entry_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /finance-entries/:financeEntryId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}

export async function fetch_expenses_list(
  filters?: ExpensesListFilters
): Promise<FinanceCollectionResult<ExpenseView>> {
  const searchParams = new URLSearchParams();
  append_query_value(searchParams, "expenseType", filters?.expenseType);
  append_query_value(searchParams, "relatedOrderId", filters?.relatedOrderId);
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  const response = await fetch_finance_payload(`/expenses${query}`);
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_expense_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /expenses")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_expense_detail(expenseId: string): Promise<FinanceDetailResult<ExpenseView>> {
  const response = await fetch_finance_payload(`/expenses/${encodeURIComponent(expenseId)}`);
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_expense_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /expenses/:expenseId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}

export async function fetch_marketing_expenses_list(
  filters?: MarketingExpensesListFilters
): Promise<FinanceCollectionResult<MarketingExpenseView>> {
  const searchParams = new URLSearchParams();
  append_query_value(searchParams, "source", filters?.source);
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  const response = await fetch_finance_payload(`/marketing-expenses${query}`);
  if (response.error || !response.payload) {
    return {
      data: [],
      pagination: null,
      error: response.error
    };
  }

  const parsed = parse_marketing_expense_collection_payload(response.payload);
  if (!parsed) {
    return {
      data: [],
      pagination: null,
      error: invalid_shape_error("GET /marketing-expenses")
    };
  }

  return {
    data: parsed.data,
    pagination: parsed.pagination,
    error: null
  };
}

export async function fetch_marketing_expense_detail(
  marketingExpenseId: string
): Promise<FinanceDetailResult<MarketingExpenseView>> {
  const response = await fetch_finance_payload(
    `/marketing-expenses/${encodeURIComponent(marketingExpenseId)}`
  );
  if (response.error || !response.payload) {
    return {
      data: null,
      error: response.error
    };
  }

  const parsed = parse_marketing_expense_detail_payload(response.payload);
  if (!parsed) {
    return {
      data: null,
      error: invalid_shape_error("GET /marketing-expenses/:marketingExpenseId")
    };
  }

  return {
    data: parsed,
    error: null
  };
}
