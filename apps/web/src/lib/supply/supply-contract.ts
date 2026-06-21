import type { AuthRoleCode } from "../../contracts/backoffice-shell.contract";

export const supplier_request_statuses = [
  "formed",
  "confirmed_by_supplier",
  "paid",
  "stocked"
] as const;

export const supplier_request_attachment_view_roles = ["warehouse", "finance", "ceo"] as const;

export type SupplierRequestStatus = (typeof supplier_request_statuses)[number];

export interface SupplyPagePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SupplierRequestSupplierView {
  id: string;
  name: string;
}

export interface SupplierRequestListView {
  id: string;
  supplierId: string;
  businessSourceType: "deal" | "order";
  businessSourceId: string;
  status: SupplierRequestStatus;
  expectedSupplyDate: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRequestSupplierView;
  itemsCount: number;
}

export interface SupplierRequestItemView {
  id: string;
  productId: string;
  quantity: string;
  unit: "шт" | "кв.м" | "п.м" | "услуга";
  sourceLineRef: string;
  sourceLineContext: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRequestDetailView {
  id: string;
  supplierId: string;
  businessSourceType: "deal" | "order";
  businessSourceId: string;
  status: SupplierRequestStatus;
  expectedSupplyDate: string;
  requestedBy: string;
  confirmedBy: string | null;
  paidBy: string | null;
  paidAt: string | null;
  stockedBy: string | null;
  stockedAt: string | null;
  supplierDocumentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRequestSupplierView;
  items: SupplierRequestItemView[];
}

export interface SupplierRequestCollectionPayload {
  data: SupplierRequestListView[];
  pagination: SupplyPagePagination | null;
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

function as_supplier_request_status(value: unknown): SupplierRequestStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return supplier_request_statuses.includes(value as SupplierRequestStatus)
    ? (value as SupplierRequestStatus)
    : null;
}

function as_supplier_request_business_source_type(value: unknown): "deal" | "order" | null {
  if (value === "deal" || value === "order") {
    return value;
  }

  return null;
}

function as_supplier_request_unit(
  value: unknown
): SupplierRequestItemView["unit"] | null {
  if (value === "шт" || value === "кв.м" || value === "п.м" || value === "услуга") {
    return value;
  }

  return null;
}

function parse_pagination(metaValue: unknown): SupplyPagePagination | null {
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

function parse_supplier(value: unknown): SupplierRequestSupplierView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const name = as_string(record.name);
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name
  };
}

function parse_supplier_request_list_item(value: unknown): SupplierRequestListView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const supplierId = as_string(record.supplierId);
  const businessSourceType = as_supplier_request_business_source_type(record.businessSourceType);
  const businessSourceId = as_string(record.businessSourceId);
  const status = as_supplier_request_status(record.status);
  const expectedSupplyDate = as_string(record.expectedSupplyDate);
  const requestedBy = as_string(record.requestedBy);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const supplier = parse_supplier(record.supplier);
  const itemsCount = as_number(record.itemsCount);

  if (
    !id ||
    !supplierId ||
    !businessSourceType ||
    !businessSourceId ||
    !status ||
    !expectedSupplyDate ||
    !requestedBy ||
    !createdAt ||
    !updatedAt ||
    !supplier ||
    itemsCount === null
  ) {
    return null;
  }

  return {
    id,
    supplierId,
    businessSourceType,
    businessSourceId,
    status,
    expectedSupplyDate,
    requestedBy,
    createdAt,
    updatedAt,
    supplier,
    itemsCount
  };
}

function parse_supplier_request_item(value: unknown): SupplierRequestItemView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const productId = as_string(record.productId);
  const quantity = as_string(record.quantity);
  const unit = as_supplier_request_unit(record.unit);
  const sourceLineRef = as_string(record.sourceLineRef);
  let sourceLineContextRecord: Record<string, unknown> | null = null;
  if (record.sourceLineContext !== undefined && record.sourceLineContext !== null) {
    sourceLineContextRecord = as_record(record.sourceLineContext);
    if (!sourceLineContextRecord) {
      return null;
    }
  }
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);

  if (
    !id ||
    !productId ||
    !quantity ||
    !unit ||
    !sourceLineRef ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    productId,
    quantity,
    unit,
    sourceLineRef,
    sourceLineContext: sourceLineContextRecord,
    createdAt,
    updatedAt
  };
}

function parse_supplier_request_detail(value: unknown): SupplierRequestDetailView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  if (!Array.isArray(record.items)) {
    return null;
  }

  const items: SupplierRequestItemView[] = [];
  for (const rawItem of record.items) {
    const parsedItem = parse_supplier_request_item(rawItem);
    if (!parsedItem) {
      return null;
    }

    items.push(parsedItem);
  }

  const id = as_string(record.id);
  const supplierId = as_string(record.supplierId);
  const businessSourceType = as_supplier_request_business_source_type(record.businessSourceType);
  const businessSourceId = as_string(record.businessSourceId);
  const status = as_supplier_request_status(record.status);
  const expectedSupplyDate = as_string(record.expectedSupplyDate);
  const requestedBy = as_string(record.requestedBy);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const supplier = parse_supplier(record.supplier);

  if (
    !id ||
    !supplierId ||
    !businessSourceType ||
    !businessSourceId ||
    !status ||
    !expectedSupplyDate ||
    !requestedBy ||
    !createdAt ||
    !updatedAt ||
    !supplier
  ) {
    return null;
  }

  return {
    id,
    supplierId,
    businessSourceType,
    businessSourceId,
    status,
    expectedSupplyDate,
    requestedBy,
    confirmedBy: as_nullable_string(record.confirmedBy),
    paidBy: as_nullable_string(record.paidBy),
    paidAt: as_nullable_string(record.paidAt),
    stockedBy: as_nullable_string(record.stockedBy),
    stockedAt: as_nullable_string(record.stockedAt),
    supplierDocumentUrl: as_nullable_string(record.supplierDocumentUrl),
    createdAt,
    updatedAt,
    supplier,
    items
  };
}

export function parse_supplier_request_collection_payload(
  payload: unknown
): SupplierRequestCollectionPayload | null {
  const root = as_record(payload);
  if (!root || !Array.isArray(root.data)) {
    return null;
  }

  const data: SupplierRequestListView[] = [];
  for (const rawItem of root.data) {
    const parsedItem = parse_supplier_request_list_item(rawItem);
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

export function parse_supplier_request_detail_payload(
  payload: unknown
): SupplierRequestDetailView | null {
  const root = as_record(payload);
  if (!root) {
    return null;
  }

  return parse_supplier_request_detail(root.data);
}

const supplier_request_attachment_view_role_set = new Set<AuthRoleCode>(
  supplier_request_attachment_view_roles
);

export function can_view_supplier_request_attachment_for_roles(
  roleCodes: readonly AuthRoleCode[]
): boolean {
  return roleCodes.some((roleCode) => supplier_request_attachment_view_role_set.has(roleCode));
}
