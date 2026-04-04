export type SortDirection = "asc" | "desc";

export interface ReadEntityQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  sortBy?: string;
  sortDirection?: SortDirection;
  includeDeleted?: boolean;
}

export interface ApiQueryFilter {
  field: string;
  operator: string;
  value?: string | number | boolean | null | Array<string | number | boolean | null>;
}

export interface ApiQuerySort {
  field: string;
  direction: SortDirection;
}

export interface ApiPageMeta {
  page: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
}

export interface ApiPaginationMeta {
  mode: "page" | "cursor";
  page?: ApiPageMeta;
}

export interface ApiEnvelopeMeta {
  requestId?: string;
  correlationId?: string;
  timestamp?: string;
  version?: string;
  pagination?: ApiPaginationMeta;
  appliedFilters?: ApiQueryFilter[];
  appliedSort?: ApiQuerySort[];
}

export interface ApiSuccessEnvelope<TData> {
  data: TData;
  meta?: ApiEnvelopeMeta;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: ApiEnvelopeMeta;
}

export type ReadEntityResourcePath =
  | "leads"
  | "deals"
  | "orders"
  | "payments"
  | "delivery-tasks"
  | "return-requests";

export interface LeadReadModel {
  id: string;
  source: string;
  status: string;
  title: string | null;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DealReadModel {
  id: string;
  leadId: string | null;
  status: string;
  title: string;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export interface OrderItemReadModel {
  id: string;
  lineNo: number;
  productRef: string;
  productNameSnapshot: string;
  qty: string;
  retailPrice: string;
  discountAmount: string;
  lineTotal: string;
  costSnapshot: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OrderReadModel {
  id: string;
  orderNumber: string;
  dealId: string;
  status: string;
  fulfillmentType: string;
  deliveryStatus: string;
  currency: string;
  totalAmount: string;
  confirmedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export interface OrderDetailReadModel extends OrderReadModel {
  items: OrderItemReadModel[];
  paymentIds: string[];
  deliveryTaskIds: string[];
  returnRequestIds: string[];
}

export interface PaymentReadModel {
  id: string;
  paymentNumber: string;
  orderId: string;
  status: string;
  paymentMethod: string;
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

export interface DeliveryTaskReadModel {
  id: string;
  orderId: string;
  status: string;
  sequenceNo: number | null;
  plannedDate: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  addressText: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ReturnRequestReadModel {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  requestedRefundAmount: string | null;
  approvedRefundAmount: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  processedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

