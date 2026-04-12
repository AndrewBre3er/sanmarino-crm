export const finance_entry_types = ["income", "expense", "adjustment"] as const;
export const expense_types = [
  "operational",
  "marketing",
  "procurement",
  "logistics",
  "other"
] as const;

export type FinanceEntryType = (typeof finance_entry_types)[number];
export type ExpenseType = (typeof expense_types)[number];

export interface FinancePagePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface FinanceEntryView {
  id: string;
  entryType: FinanceEntryType;
  amount: string;
  currency: string;
  recognizedAt: string;
  paymentId: string | null;
  expenseId: string | null;
  marketingExpenseId: string | null;
  orderId: string | null;
  cashOperationId: string | null;
  description: string | null;
}

export interface ExpenseView {
  id: string;
  expenseType: ExpenseType;
  amount: string;
  currency: string;
  occurredAt: string;
  description: string | null;
  relatedOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingExpenseView {
  id: string;
  source: string;
  campaign: string | null;
  amount: string;
  currency: string;
  occurredAt: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCollectionPayload<TItem> {
  data: TItem[];
  pagination: FinancePagePagination | null;
}

function as_record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function as_string(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function as_nullable_string(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function as_number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function as_finance_entry_type(value: unknown): FinanceEntryType | null {
  if (typeof value !== "string") {
    return null;
  }

  return finance_entry_types.includes(value as FinanceEntryType)
    ? (value as FinanceEntryType)
    : null;
}

function as_expense_type(value: unknown): ExpenseType | null {
  if (typeof value !== "string") {
    return null;
  }

  return expense_types.includes(value as ExpenseType) ? (value as ExpenseType) : null;
}

function parse_pagination(metaValue: unknown): FinancePagePagination | null {
  const metaRecord = as_record(metaValue);
  if (!metaRecord) {
    return null;
  }

  const paginationRecord = as_record(metaRecord.pagination);
  if (!paginationRecord) {
    return null;
  }

  const mode = as_string(paginationRecord.mode);
  if (mode !== "page") {
    return null;
  }

  const pageRecord = as_record(paginationRecord.page);
  if (!pageRecord) {
    return null;
  }

  const page = as_number(pageRecord.page);
  const pageSize = as_number(pageRecord.pageSize);
  const totalItems = as_number(pageRecord.totalItems);
  const totalPages = as_number(pageRecord.totalPages);

  if (page === null || pageSize === null || totalItems === null || totalPages === null) {
    return null;
  }

  return {
    page,
    pageSize,
    totalItems,
    totalPages
  };
}

function parse_collection_payload<TItem>(
  payload: unknown,
  parseItem: (value: unknown) => TItem | null
): FinanceCollectionPayload<TItem> | null {
  const root = as_record(payload);
  if (!root || !Array.isArray(root.data)) {
    return null;
  }

  const data: TItem[] = [];
  for (const rawItem of root.data) {
    const parsedItem = parseItem(rawItem);
    if (!parsedItem) {
      return null;
    }

    data.push(parsedItem);
  }

  return {
    data,
    pagination: parse_pagination(root.meta)
  };
}

function parse_detail_payload<TItem>(
  payload: unknown,
  parseItem: (value: unknown) => TItem | null
): TItem | null {
  const root = as_record(payload);
  if (!root) {
    return null;
  }

  return parseItem(root.data);
}

function parse_finance_entry(value: unknown): FinanceEntryView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const entryType = as_finance_entry_type(record.entryType);
  const amount = as_string(record.amount);
  const currency = as_string(record.currency);
  const recognizedAt = as_string(record.recognizedAt);

  if (!id || !entryType || !amount || !currency || !recognizedAt) {
    return null;
  }

  return {
    id,
    entryType,
    amount,
    currency,
    recognizedAt,
    paymentId: as_nullable_string(record.paymentId),
    expenseId: as_nullable_string(record.expenseId),
    marketingExpenseId: as_nullable_string(record.marketingExpenseId),
    orderId: as_nullable_string(record.orderId),
    cashOperationId: as_nullable_string(record.cashOperationId),
    description: as_nullable_string(record.description)
  };
}

function parse_expense(value: unknown): ExpenseView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const expenseType = as_expense_type(record.expenseType);
  const amount = as_string(record.amount);
  const currency = as_string(record.currency);
  const occurredAt = as_string(record.occurredAt);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);

  if (!id || !expenseType || !amount || !currency || !occurredAt || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    expenseType,
    amount,
    currency,
    occurredAt,
    description: as_nullable_string(record.description),
    relatedOrderId: as_nullable_string(record.relatedOrderId),
    createdAt,
    updatedAt
  };
}

function parse_marketing_expense(value: unknown): MarketingExpenseView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const source = as_string(record.source);
  const amount = as_string(record.amount);
  const currency = as_string(record.currency);
  const occurredAt = as_string(record.occurredAt);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);

  if (!id || !source || !amount || !currency || !occurredAt || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    source,
    campaign: as_nullable_string(record.campaign),
    amount,
    currency,
    occurredAt,
    description: as_nullable_string(record.description),
    createdAt,
    updatedAt
  };
}

export function parse_finance_entry_collection_payload(
  payload: unknown
): FinanceCollectionPayload<FinanceEntryView> | null {
  return parse_collection_payload(payload, parse_finance_entry);
}

export function parse_finance_entry_detail_payload(payload: unknown): FinanceEntryView | null {
  return parse_detail_payload(payload, parse_finance_entry);
}

export function parse_expense_collection_payload(
  payload: unknown
): FinanceCollectionPayload<ExpenseView> | null {
  return parse_collection_payload(payload, parse_expense);
}

export function parse_expense_detail_payload(payload: unknown): ExpenseView | null {
  return parse_detail_payload(payload, parse_expense);
}

export function parse_marketing_expense_collection_payload(
  payload: unknown
): FinanceCollectionPayload<MarketingExpenseView> | null {
  return parse_collection_payload(payload, parse_marketing_expense);
}

export function parse_marketing_expense_detail_payload(
  payload: unknown
): MarketingExpenseView | null {
  return parse_detail_payload(payload, parse_marketing_expense);
}
