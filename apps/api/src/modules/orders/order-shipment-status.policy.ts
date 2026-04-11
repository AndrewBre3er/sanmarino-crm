import type { OrderStatus } from "../transactional/shared/status.contract";

const qty_epsilon = 0.000001;

export interface OrderShipmentProgressOrderItemInput {
  orderItemId: string;
  qty: number;
}

export interface OrderShipmentProgressCompletedItemInput {
  orderItemId: string;
  qty: number;
}

export interface OrderShipmentProgressInput {
  orderItems: OrderShipmentProgressOrderItemInput[];
  completedFulfillmentCount: number;
  pendingFulfillmentCount: number;
  completedShipmentItems: OrderShipmentProgressCompletedItemInput[];
}

export interface OrderShipmentProgressSummary {
  hasOrderItems: boolean;
  hasCompletedFulfillment: boolean;
  hasPendingFulfillment: boolean;
  hasItemLevelShipmentEvidence: boolean;
  isFullyFulfilled: boolean;
  recommendedStatus: Extract<OrderStatus, "partially_shipped" | "shipped"> | null;
}

export class OrderShipmentProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderShipmentProgressError";
  }
}

export function evaluate_order_shipment_progress(
  input: OrderShipmentProgressInput
): OrderShipmentProgressSummary {
  const has_completed_fulfillment = input.completedFulfillmentCount > 0;
  const has_pending_fulfillment = input.pendingFulfillmentCount > 0;
  const has_order_items = input.orderItems.length > 0;

  if (!has_order_items) {
    const recommended_status =
      !has_completed_fulfillment
        ? null
        : has_pending_fulfillment
          ? "partially_shipped"
          : "shipped";

    return {
      hasOrderItems: false,
      hasCompletedFulfillment: has_completed_fulfillment,
      hasPendingFulfillment: has_pending_fulfillment,
      hasItemLevelShipmentEvidence: false,
      isFullyFulfilled: recommended_status === "shipped",
      recommendedStatus: recommended_status
    };
  }

  const order_item_qty_by_id = new Map<string, number>();
  for (const item of input.orderItems) {
    const existing_qty = order_item_qty_by_id.get(item.orderItemId) ?? 0;
    order_item_qty_by_id.set(item.orderItemId, existing_qty + item.qty);
  }

  const completed_qty_by_item_id = new Map<string, number>();
  for (const completed_item of input.completedShipmentItems) {
    const order_item_qty = order_item_qty_by_id.get(completed_item.orderItemId);
    if (order_item_qty === undefined) {
      throw new OrderShipmentProgressError(
        `Completed fulfillment item '${completed_item.orderItemId}' is not linked to order items`
      );
    }

    const completed_qty = (completed_qty_by_item_id.get(completed_item.orderItemId) ?? 0) + completed_item.qty;
    if (completed_qty > order_item_qty + qty_epsilon) {
      throw new OrderShipmentProgressError(
        `Completed fulfillment qty exceeds order item qty for '${completed_item.orderItemId}'`
      );
    }

    completed_qty_by_item_id.set(completed_item.orderItemId, completed_qty);
  }

  const has_item_level_shipment_evidence = Array.from(completed_qty_by_item_id.values()).some(
    (completed_qty) => completed_qty > qty_epsilon
  );
  const is_fully_fulfilled = input.orderItems.every((item) => {
    const completed_qty = completed_qty_by_item_id.get(item.orderItemId) ?? 0;
    return completed_qty + qty_epsilon >= item.qty;
  });

  const recommended_status =
    !has_completed_fulfillment
      ? null
      : is_fully_fulfilled
        ? "shipped"
        : has_item_level_shipment_evidence
          ? "partially_shipped"
          : null;

  return {
    hasOrderItems: true,
    hasCompletedFulfillment: has_completed_fulfillment,
    hasPendingFulfillment: has_pending_fulfillment,
    hasItemLevelShipmentEvidence: has_item_level_shipment_evidence,
    isFullyFulfilled: is_fully_fulfilled,
    recommendedStatus: recommended_status
  };
}
