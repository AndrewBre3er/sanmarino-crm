export const crm_lead_statuses = ["new", "in_processing", "cancelled"] as const;
export const crm_deal_statuses = ["in_progress", "converted_to_order", "cancelled"] as const;

export type CrmLeadStatus = (typeof crm_lead_statuses)[number];
export type CrmDealStatus = (typeof crm_deal_statuses)[number];

export interface CrmPagePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CrmLeadView {
  id: string;
  source: string;
  status: CrmLeadStatus;
  clientId: string | null;
  contactId: string | null;
  title: string | null;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CrmDealView {
  id: string;
  leadId: string | null;
  clientId: string;
  contactId: string | null;
  status: CrmDealStatus;
  title: string;
  notes: string | null;
  responsibleUserId: string | null;
  nextContactAt: string | null;
  lostReason: string | null;
  isStuck: boolean;
  stuckReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export interface CrmCollectionPayload<TItem> {
  data: TItem[];
  pagination: CrmPagePagination | null;
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

function as_lead_status(value: unknown): CrmLeadStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return crm_lead_statuses.includes(value as CrmLeadStatus) ? (value as CrmLeadStatus) : null;
}

function as_deal_status(value: unknown): CrmDealStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return crm_deal_statuses.includes(value as CrmDealStatus) ? (value as CrmDealStatus) : null;
}

function parse_pagination(metaValue: unknown): CrmPagePagination | null {
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
): CrmCollectionPayload<TItem> | null {
  const root = as_record(payload);
  if (!root || !Array.isArray(root.data)) {
    return null;
  }

  const items: TItem[] = [];
  for (const rawItem of root.data) {
    const parsedItem = parseItem(rawItem);
    if (!parsedItem) {
      return null;
    }

    items.push(parsedItem);
  }

  return {
    data: items,
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

function parse_crm_lead(value: unknown): CrmLeadView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const source = as_string(record.source);
  const status = as_lead_status(record.status);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const version = as_number(record.version);

  if (!id || !source || !status || !createdAt || !updatedAt || version === null) {
    return null;
  }

  return {
    id,
    source,
    status,
    clientId: as_nullable_string(record.clientId),
    contactId: as_nullable_string(record.contactId),
    title: as_nullable_string(record.title),
    notes: as_nullable_string(record.notes),
    responsibleUserId: as_nullable_string(record.responsibleUserId),
    createdAt,
    updatedAt,
    version
  };
}

function parse_crm_deal(value: unknown): CrmDealView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const clientId = as_string(record.clientId);
  const status = as_deal_status(record.status);
  const title = as_string(record.title);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const version = as_number(record.version);
  const isDeleted = as_boolean(record.isDeleted);

  if (
    !id ||
    !clientId ||
    !status ||
    !title ||
    !createdAt ||
    !updatedAt ||
    version === null ||
    isDeleted === null
  ) {
    return null;
  }

  return {
    id,
    leadId: as_nullable_string(record.leadId),
    clientId,
    contactId: as_nullable_string(record.contactId),
    status,
    title,
    notes: as_nullable_string(record.notes),
    responsibleUserId: as_nullable_string(record.responsibleUserId),
    nextContactAt: as_nullable_string(record.nextContactAt),
    lostReason: as_nullable_string(record.lostReason),
    isStuck: as_boolean(record.isStuck) ?? false,
    stuckReason: as_nullable_string(record.stuckReason),
    createdAt,
    updatedAt,
    version,
    deletedAt: as_nullable_string(record.deletedAt),
    deletedBy: as_nullable_string(record.deletedBy),
    deleteReason: as_nullable_string(record.deleteReason),
    isDeleted
  };
}

export function parse_crm_lead_collection_payload(
  payload: unknown
): CrmCollectionPayload<CrmLeadView> | null {
  return parse_collection_payload(payload, parse_crm_lead);
}

export function parse_crm_lead_detail_payload(payload: unknown): CrmLeadView | null {
  return parse_detail_payload(payload, parse_crm_lead);
}

export function parse_crm_deal_collection_payload(
  payload: unknown
): CrmCollectionPayload<CrmDealView> | null {
  return parse_collection_payload(payload, parse_crm_deal);
}

export function parse_crm_deal_detail_payload(payload: unknown): CrmDealView | null {
  return parse_detail_payload(payload, parse_crm_deal);
}
