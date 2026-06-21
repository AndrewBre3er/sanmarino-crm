export const order_statuses = [
  "assembling",
  "ready_for_partial_shipment",
  "ready_for_shipment",
  "partially_shipped",
  "shipped"
] as const;

export const order_payment_control_statuses = ["none", "on_control", "problem"] as const;

export const order_delivery_statuses = [
  "not_scheduled",
  "scheduled",
  "partially_delivered",
  "delivered",
  "failed"
] as const;

export const order_fulfillment_types = ["delivery", "pickup", "manual"] as const;

export const order_item_units = ["шт", "кв.м", "п.м", "услуга"] as const;

export const fulfillment_statuses = ["pending", "completed", "failed", "cancelled"] as const;

export type OrderStatus = (typeof order_statuses)[number];
export type OrderPaymentControlStatus = (typeof order_payment_control_statuses)[number];
export type OrderDeliveryStatus = (typeof order_delivery_statuses)[number];
export type OrderFulfillmentType = (typeof order_fulfillment_types)[number];
export type OrderItemUnit = (typeof order_item_units)[number];
export type FulfillmentStatus = (typeof fulfillment_statuses)[number];

export interface OrdersPagePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface OrderListView {
  id: string;
  orderNumber: string;
  dealId: string;
  clientId: string;
  status: OrderStatus;
  paymentControlStatus: OrderPaymentControlStatus;
  paymentControlDueAt: string | null;
  fulfillmentType: OrderFulfillmentType;
  deliveryStatus: OrderDeliveryStatus;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
  readyForPartialShipmentAt: string | null;
  readyForShipmentAt: string | null;
  partiallyShippedAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export interface OrderItemView {
  id: string;
  lineNo: number;
  productId: string;
  productNameSnapshot: string;
  qty: string;
  unit: OrderItemUnit;
  retailPrice: string;
  discountAmount: string;
  lineTotal: string;
  costSnapshot: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OrderDetailView extends OrderListView {
  items: OrderItemView[];
  paymentIds: string[];
  deliveryTaskIds: string[];
  returnRequestIds: string[];
}

export interface OrdersCollectionPayload {
  data: OrderListView[];
  pagination: OrdersPagePagination | null;
}

export interface FulfillmentListView {
  id: string;
  orderId: string;
  status: FulfillmentStatus;
  fulfillmentType: OrderFulfillmentType;
  fulfilledAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  itemsCount: number;
}

export interface FulfillmentItemView {
  id: string;
  fulfillmentId: string;
  orderItemId: string;
  qty: string;
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentDetailView extends FulfillmentListView {
  items: FulfillmentItemView[];
}

export interface FulfillmentCollectionPayload {
  data: FulfillmentListView[];
  pagination: OrdersPagePagination | null;
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

function as_order_status(value: unknown): OrderStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return order_statuses.includes(value as OrderStatus) ? (value as OrderStatus) : null;
}

function as_order_payment_control_status(value: unknown): OrderPaymentControlStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return order_payment_control_statuses.includes(value as OrderPaymentControlStatus)
    ? (value as OrderPaymentControlStatus)
    : null;
}

function as_order_delivery_status(value: unknown): OrderDeliveryStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return order_delivery_statuses.includes(value as OrderDeliveryStatus)
    ? (value as OrderDeliveryStatus)
    : null;
}

function as_order_fulfillment_type(value: unknown): OrderFulfillmentType | null {
  if (typeof value !== "string") {
    return null;
  }

  return order_fulfillment_types.includes(value as OrderFulfillmentType)
    ? (value as OrderFulfillmentType)
    : null;
}

function as_order_item_unit(value: unknown): OrderItemUnit | null {
  if (typeof value !== "string") {
    return null;
  }

  return order_item_units.includes(value as OrderItemUnit) ? (value as OrderItemUnit) : null;
}

function as_fulfillment_status(value: unknown): FulfillmentStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return fulfillment_statuses.includes(value as FulfillmentStatus)
    ? (value as FulfillmentStatus)
    : null;
}

function as_string_array(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }

    result.push(item);
  }

  return result;
}

function parse_pagination(metaValue: unknown): OrdersPagePagination | null {
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

function parse_order_list_item(value: unknown): OrderListView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const orderNumber = as_string(record.orderNumber);
  const dealId = as_string(record.dealId);
  const clientId = as_string(record.clientId);
  const status = as_order_status(record.status);
  const paymentControlStatus = as_order_payment_control_status(record.paymentControlStatus);
  const fulfillmentType = as_order_fulfillment_type(record.fulfillmentType);
  const deliveryStatus = as_order_delivery_status(record.deliveryStatus);
  const currency = as_string(record.currency);
  const subtotalAmount = as_string(record.subtotalAmount);
  const discountAmount = as_string(record.discountAmount);
  const totalAmount = as_string(record.totalAmount);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const version = as_number(record.version);
  const isDeleted = as_boolean(record.isDeleted);

  if (
    !id ||
    !orderNumber ||
    !dealId ||
    !clientId ||
    !status ||
    !paymentControlStatus ||
    !fulfillmentType ||
    !deliveryStatus ||
    !currency ||
    !subtotalAmount ||
    !discountAmount ||
    !totalAmount ||
    !createdAt ||
    !updatedAt ||
    version === null ||
    isDeleted === null
  ) {
    return null;
  }

  return {
    id,
    orderNumber,
    dealId,
    clientId,
    status,
    paymentControlStatus,
    paymentControlDueAt: as_nullable_string(record.paymentControlDueAt),
    fulfillmentType,
    deliveryStatus,
    currency,
    subtotalAmount,
    discountAmount,
    totalAmount,
    notes: as_nullable_string(record.notes),
    readyForPartialShipmentAt: as_nullable_string(record.readyForPartialShipmentAt),
    readyForShipmentAt: as_nullable_string(record.readyForShipmentAt),
    partiallyShippedAt: as_nullable_string(record.partiallyShippedAt),
    shippedAt: as_nullable_string(record.shippedAt),
    createdAt,
    updatedAt,
    version,
    deletedAt: as_nullable_string(record.deletedAt),
    deletedBy: as_nullable_string(record.deletedBy),
    deleteReason: as_nullable_string(record.deleteReason),
    isDeleted
  };
}

function parse_order_item(value: unknown): OrderItemView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const lineNo = as_number(record.lineNo);
  const productId = as_string(record.productId);
  const productNameSnapshot = as_string(record.productNameSnapshot);
  const qty = as_string(record.qty);
  const unit = as_order_item_unit(record.unit);
  const retailPrice = as_string(record.retailPrice);
  const discountAmount = as_string(record.discountAmount);
  const lineTotal = as_string(record.lineTotal);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const version = as_number(record.version);

  if (
    !id ||
    lineNo === null ||
    !productId ||
    !productNameSnapshot ||
    !qty ||
    !unit ||
    !retailPrice ||
    !discountAmount ||
    !lineTotal ||
    !createdAt ||
    !updatedAt ||
    version === null
  ) {
    return null;
  }

  return {
    id,
    lineNo,
    productId,
    productNameSnapshot,
    qty,
    unit,
    retailPrice,
    discountAmount,
    lineTotal,
    costSnapshot: as_nullable_string(record.costSnapshot),
    notes: as_nullable_string(record.notes),
    createdAt,
    updatedAt,
    version
  };
}

function parse_order_detail(value: unknown): OrderDetailView | null {
  const record = as_record(value);
  if (!record || !Array.isArray(record.items)) {
    return null;
  }

  const base = parse_order_list_item(record);
  if (!base) {
    return null;
  }

  const items: OrderItemView[] = [];
  for (const rawItem of record.items) {
    const parsedItem = parse_order_item(rawItem);
    if (!parsedItem) {
      return null;
    }

    items.push(parsedItem);
  }

  const paymentIds = as_string_array(record.paymentIds);
  const deliveryTaskIds = as_string_array(record.deliveryTaskIds);
  const returnRequestIds = as_string_array(record.returnRequestIds);

  if (!paymentIds || !deliveryTaskIds || !returnRequestIds) {
    return null;
  }

  return {
    ...base,
    items,
    paymentIds,
    deliveryTaskIds,
    returnRequestIds
  };
}

function parse_fulfillment_list_item(value: unknown): FulfillmentListView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const orderId = as_string(record.orderId);
  const status = as_fulfillment_status(record.status);
  const fulfillmentType = as_order_fulfillment_type(record.fulfillmentType);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);
  const version = as_number(record.version);
  const itemsCount = as_number(record.itemsCount);

  if (
    !id ||
    !orderId ||
    !status ||
    !fulfillmentType ||
    !createdAt ||
    !updatedAt ||
    version === null ||
    itemsCount === null
  ) {
    return null;
  }

  return {
    id,
    orderId,
    status,
    fulfillmentType,
    fulfilledAt: as_nullable_string(record.fulfilledAt),
    failureReason: as_nullable_string(record.failureReason),
    createdAt,
    updatedAt,
    version,
    itemsCount
  };
}

function parse_fulfillment_item(value: unknown): FulfillmentItemView | null {
  const record = as_record(value);
  if (!record) {
    return null;
  }

  const id = as_string(record.id);
  const fulfillmentId = as_string(record.fulfillmentId);
  const orderItemId = as_string(record.orderItemId);
  const qty = as_string(record.qty);
  const createdAt = as_string(record.createdAt);
  const updatedAt = as_string(record.updatedAt);

  if (!id || !fulfillmentId || !orderItemId || !qty || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    fulfillmentId,
    orderItemId,
    qty,
    createdAt,
    updatedAt
  };
}

function parse_fulfillment_detail(value: unknown): FulfillmentDetailView | null {
  const record = as_record(value);
  if (!record || !Array.isArray(record.items)) {
    return null;
  }

  const base = parse_fulfillment_list_item(record);
  if (!base) {
    return null;
  }

  const items: FulfillmentItemView[] = [];
  for (const rawItem of record.items) {
    const parsedItem = parse_fulfillment_item(rawItem);
    if (!parsedItem) {
      return null;
    }

    items.push(parsedItem);
  }

  return {
    ...base,
    items
  };
}

export function parse_order_collection_payload(payload: unknown): OrdersCollectionPayload | null {
  const root = as_record(payload);
  if (!root || !Array.isArray(root.data)) {
    return null;
  }

  const data: OrderListView[] = [];
  for (const rawItem of root.data) {
    const parsedItem = parse_order_list_item(rawItem);
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

export function parse_order_detail_payload(payload: unknown): OrderDetailView | null {
  const root = as_record(payload);
  if (!root) {
    return null;
  }

  return parse_order_detail(root.data);
}

export function parse_fulfillment_collection_payload(
  payload: unknown
): FulfillmentCollectionPayload | null {
  const root = as_record(payload);
  if (!root || !Array.isArray(root.data)) {
    return null;
  }

  const data: FulfillmentListView[] = [];
  for (const rawItem of root.data) {
    const parsedItem = parse_fulfillment_list_item(rawItem);
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

export function parse_fulfillment_detail_payload(payload: unknown): FulfillmentDetailView | null {
  const root = as_record(payload);
  if (!root) {
    return null;
  }

  return parse_fulfillment_detail(root.data);
}

export function filter_fulfillments_by_order(
  fulfillments: readonly FulfillmentListView[],
  orderId: string
): FulfillmentListView[] {
  return fulfillments.filter((fulfillment) => fulfillment.orderId === orderId);
}
