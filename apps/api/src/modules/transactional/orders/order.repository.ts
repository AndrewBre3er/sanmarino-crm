import type {
  PersistenceListQuery,
  PersistenceRecordBase,
  RepositoryBaseContract,
  RepositoryFindOptions,
  RepositorySoftDeleteOptions,
  RepositoryUpdateOptions,
  TransactionContext
} from "../../../common/persistence";
import type { PrismaService } from "../../../prisma/prisma.service";
import type {
  OrderDeliveryStatus as PrismaOrderDeliveryStatus,
  OrderFulfillmentType as PrismaOrderFulfillmentType,
  OrderPaymentControlStatus as PrismaOrderPaymentControlStatus,
  OrdersOrder,
  OrderStatus as PrismaOrderStatus
} from "@prisma/client";
import { throw_deferred_skeleton } from "../shared/deferred-skeleton.error";
import type {
  OrderControlOverlayStatus,
  OrderDeliveryStatus,
  OrderFulfillmentType,
  OrderStatus
} from "../shared/status.contract";

export interface OrdersOrderRecord extends PersistenceRecordBase {
  orderNumber: string;
  dealId: string;
  clientId: string;
  status: OrderStatus;
  paymentControlStatus: OrderControlOverlayStatus;
  paymentControlDueAt?: string | null;
  fulfillmentType: OrderFulfillmentType;
  deliveryStatus: OrderDeliveryStatus;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes?: string | null;
  readyForPartialShipmentAt?: string | null;
  readyForShipmentAt?: string | null;
  partiallyShippedAt?: string | null;
  shippedAt?: string | null;
}

export interface EnsureOrderFromDealInput {
  dealId: string;
  clientId: string;
  deliveryMode?: string | null;
  notes?: string | null;
}

export interface OrdersOrderCreateInput {
  orderNumber: string;
  dealId: string;
  clientId: string;
  status: OrderStatus;
  paymentControlStatus?: OrderControlOverlayStatus;
  paymentControlDueAt?: string | null;
  fulfillmentType: OrderFulfillmentType;
  deliveryStatus?: OrderDeliveryStatus;
  currency?: string;
  subtotalAmount?: string;
  discountAmount?: string;
  totalAmount?: string;
  notes?: string | null;
  readyForPartialShipmentAt?: string | null;
  readyForShipmentAt?: string | null;
  partiallyShippedAt?: string | null;
  shippedAt?: string | null;
}

export interface OrdersOrderUpdateInput {
  status?: OrderStatus;
  paymentControlStatus?: OrderControlOverlayStatus;
  paymentControlDueAt?: string | null;
  fulfillmentType?: OrderFulfillmentType;
  deliveryStatus?: OrderDeliveryStatus;
  subtotalAmount?: string;
  discountAmount?: string;
  totalAmount?: string;
  notes?: string | null;
  readyForPartialShipmentAt?: string | null;
  readyForShipmentAt?: string | null;
  partiallyShippedAt?: string | null;
  shippedAt?: string | null;
}

export interface OrdersOrderRepositoryContract
  extends RepositoryBaseContract<OrdersOrderRecord, OrdersOrderCreateInput, OrdersOrderUpdateInput> {
  withTransaction(context: TransactionContext): OrdersOrderRepositoryContract;
  ensureFromDeal(
    input: EnsureOrderFromDealInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord>;
}

export class PrismaOrdersOrderRepository implements OrdersOrderRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): OrdersOrderRepositoryContract {
    return new PrismaOrdersOrderRepository(this.prismaService, context);
  }

  async ensureFromDeal(
    input: EnsureOrderFromDealInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord> {
    void options;
    const client = this.get_client();

    const existingByDeal = await client.ordersOrder.findFirst({
      where: {
        dealId: input.dealId,
        isDeleted: false
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (existingByDeal) {
      return map_orders_order_record(existingByDeal);
    }

    const orderNumber = build_baseline_order_number_from_deal_id(input.dealId);

    try {
      const created = await client.ordersOrder.create({
        data: {
          orderNumber,
          dealId: input.dealId,
          clientId: input.clientId,
          status: "ASSEMBLING",
          fulfillmentType: map_deal_delivery_mode_to_order_fulfillment_type(input.deliveryMode),
          ...(input.notes !== undefined ? { notes: input.notes } : {})
        }
      });

      return map_orders_order_record(created);
    } catch (error) {
      if (!is_prisma_unique_constraint_error(error)) {
        throw error;
      }

      const existingByNumber = await client.ordersOrder.findUnique({
        where: { orderNumber }
      });

      if (existingByNumber) {
        return map_orders_order_record(existingByNumber);
      }

      const fallbackByDeal = await client.ordersOrder.findFirst({
        where: {
          dealId: input.dealId,
          isDeleted: false
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      if (fallbackByDeal) {
        return map_orders_order_record(fallbackByDeal);
      }

      throw error;
    }
  }

  async findById(id: string, options?: RepositoryFindOptions): Promise<OrdersOrderRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: OrdersOrderRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "list");
  }

  async create(
    input: OrdersOrderCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "create");
  }

  async updateById(
    id: string,
    input: OrdersOrderUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "restoreById");
  }

  private touch_context(id: string): void {
    const client = this.get_client();
    void client;
    void id;
  }

  private get_client(): PrismaService {
    return (this.transactionContext?.client ?? this.prismaService) as PrismaService;
  }
}

const prisma_status_to_order: Record<PrismaOrderStatus, OrderStatus> = {
  ASSEMBLING: "assembling",
  READY_FOR_PARTIAL_SHIPMENT: "ready_for_partial_shipment",
  READY_FOR_SHIPMENT: "ready_for_shipment",
  PARTIALLY_SHIPPED: "partially_shipped",
  SHIPPED: "shipped"
};

const prisma_order_control_overlay_to_contract: Record<
  PrismaOrderPaymentControlStatus,
  OrderControlOverlayStatus
> = {
  NONE: "none",
  ON_CONTROL: "on_control",
  PROBLEM: "problem"
};

const prisma_order_delivery_to_contract: Record<PrismaOrderDeliveryStatus, OrderDeliveryStatus> = {
  NOT_SCHEDULED: "not_scheduled",
  SCHEDULED: "scheduled",
  PARTIALLY_DELIVERED: "partially_delivered",
  DELIVERED: "delivered",
  FAILED: "failed"
};

const prisma_order_fulfillment_to_contract: Record<PrismaOrderFulfillmentType, OrderFulfillmentType> =
  {
    DELIVERY: "delivery",
    PICKUP: "pickup",
    MANUAL: "manual"
  };

function map_decimal_to_string(value: unknown): string {
  if (value == null) {
    return "0";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "object" && typeof (value as { toString?: unknown }).toString === "function") {
    return (value as { toString: () => string }).toString();
  }

  return "0";
}

function to_iso_datetime(value: Date): string {
  return value.toISOString();
}

function map_orders_order_record(record: OrdersOrder): OrdersOrderRecord {
  return {
    id: record.id,
    orderNumber: record.orderNumber,
    dealId: record.dealId,
    clientId: record.clientId,
    status: prisma_status_to_order[record.status],
    paymentControlStatus: prisma_order_control_overlay_to_contract[record.paymentControlStatus],
    paymentControlDueAt: record.paymentControlDueAt ? to_iso_datetime(record.paymentControlDueAt) : null,
    fulfillmentType: prisma_order_fulfillment_to_contract[record.fulfillmentType],
    deliveryStatus: prisma_order_delivery_to_contract[record.deliveryStatus],
    currency: record.currency,
    subtotalAmount: map_decimal_to_string(record.subtotalAmount),
    discountAmount: map_decimal_to_string(record.discountAmount),
    totalAmount: map_decimal_to_string(record.totalAmount),
    notes: record.notes,
    readyForPartialShipmentAt: record.readyForPartialShipmentAt
      ? to_iso_datetime(record.readyForPartialShipmentAt)
      : null,
    readyForShipmentAt: record.readyForShipmentAt ? to_iso_datetime(record.readyForShipmentAt) : null,
    partiallyShippedAt: record.partiallyShippedAt ? to_iso_datetime(record.partiallyShippedAt) : null,
    shippedAt: record.shippedAt ? to_iso_datetime(record.shippedAt) : null,
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt),
    version: record.version,
    deletedAt: record.deletedAt ? to_iso_datetime(record.deletedAt) : null,
    deletedBy: record.deletedBy,
    deleteReason: record.deleteReason,
    isDeleted: record.isDeleted
  };
}

function map_deal_delivery_mode_to_order_fulfillment_type(
  deliveryMode: string | null | undefined
): PrismaOrderFulfillmentType {
  const normalizedMode = deliveryMode?.trim().toLowerCase();

  if (normalizedMode === "delivery") {
    return "DELIVERY";
  }

  if (normalizedMode === "pickup") {
    return "PICKUP";
  }

  return "MANUAL";
}

function build_baseline_order_number_from_deal_id(dealId: string): string {
  // Orders Step 2 baseline: deterministic 1:1 materialization key for deal->order idempotency.
  // Future deal->N expansion can introduce sequence suffixes without changing current contract.
  return `ORD-DEAL-${dealId}`;
}

function is_prisma_unique_constraint_error(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
