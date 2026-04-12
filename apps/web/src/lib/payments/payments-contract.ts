export const payment_statuses = ["pending", "completed", "refunded"] as const;
export const payment_methods = ["cash", "bank_transfer", "card", "sbp", "other"] as const;

export type PaymentStatus = (typeof payment_statuses)[number];
export type PaymentMethod = (typeof payment_methods)[number];

export interface PaymentsPagePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaymentListView {
  id: string;
  paymentNumber: string;
  orderId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  amount: string;
  refundedAmount: string;
  receivedAt: string | null;
  externalReference: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export type PaymentDetailView = PaymentListView;

export interface PaymentsCollectionPayload {
  data: PaymentListView[];
  pagination: PaymentsPagePagination | null;
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

function as_boolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function as_payment_status(value: unknown): PaymentStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return payment_statuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : null;
}

function as_payment_method(value: unknown): PaymentMethod | null {
  if (typeof value !== "string") {
    return null;
  }

  return payment_methods.includes(value as PaymentMethod) ? (value as PaymentMethod) : null;
}

function parse_pagination(metaValue: unknown): PaymentsPagePagination | null {
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

function parse_payment(value: unknown): PaymentListView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const paymentNumber = as_string(record.paymentNumber);
  const orderId = as_string(record.orderId);
  const status = as_payment_status(record.status);
  const paymentMethod = as_payment_method(record.paymentMethod);
  const amount = as_string(record.amount);
  const refundedAmount = as_string(record.refundedAmount);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const version = as_number(record.version);
  const isDeleted = as_boolean(record.isDeleted);

  if (
    !id ||
    !paymentNumber ||
    !orderId ||
    !status ||
    !paymentMethod ||
    !amount ||
    !refundedAmount ||
    !createdAt ||
    !updatedAt ||
    version === null ||
    isDeleted === null
  ) {
    return null;
  }

  return {
    id,
    paymentNumber,
    orderId,
    status,
    paymentMethod,
    amount,
    refundedAmount,
    receivedAt: as_nullable_string(record.receivedAt),
    externalReference: as_nullable_string(record.externalReference),
    createdAt,
    updatedAt,
    version,
    deletedAt: as_nullable_string(record.deletedAt),
    deletedBy: as_nullable_string(record.deletedBy),
    deleteReason: as_nullable_string(record.deleteReason),
    isDeleted
  };
}

export function parse_payment_collection_payload(payload: unknown): PaymentsCollectionPayload | null {
  const root = as_record(payload);
  if (!root || !Array.isArray(root.data)) {
    return null;
  }

  const data: PaymentListView[] = [];
  for (const rawItem of root.data) {
    const parsedItem = parse_payment(rawItem);
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

export function parse_payment_detail_payload(payload: unknown): PaymentDetailView | null {
  const root = as_record(payload);
  if (!root) {
    return null;
  }

  return parse_payment(root.data);
}
