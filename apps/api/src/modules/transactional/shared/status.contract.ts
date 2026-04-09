export const deal_statuses = [
  "in_progress",
  "converted_to_order",
  "cancelled"
] as const;

export const lead_statuses = ["new", "in_processing", "cancelled"] as const;

export const order_statuses = [
  "draft",
  "confirmed",
  "reserved",
  "in_progress",
  "completed",
  "closed",
  "cancelled",
  "partial_return",
  "full_return"
] as const;

export const order_delivery_statuses = [
  "not_scheduled",
  "scheduled",
  "partially_delivered",
  "delivered",
  "failed"
] as const;

export const order_fulfillment_types = ["delivery", "pickup", "manual"] as const;

export const delivery_task_statuses = [
  "planned",
  "assigned",
  "in_transit",
  "delivered",
  "failed",
  "rescheduled"
] as const;

export const return_request_statuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "processed",
  "closed"
] as const;

export const payment_statuses = ["pending", "completed", "refunded"] as const;

export const payment_methods = ["cash", "bank_transfer", "card", "sbp", "other"] as const;

export const active_delivery_task_statuses = [
  "planned",
  "assigned",
  "in_transit",
  "rescheduled"
] as const;

export type DealStatus = (typeof deal_statuses)[number];
export type LeadStatus = (typeof lead_statuses)[number];
export type OrderStatus = (typeof order_statuses)[number];
export type OrderDeliveryStatus = (typeof order_delivery_statuses)[number];
export type OrderFulfillmentType = (typeof order_fulfillment_types)[number];
export type DeliveryTaskStatus = (typeof delivery_task_statuses)[number];
export type ReturnRequestStatus = (typeof return_request_statuses)[number];
export type PaymentStatus = (typeof payment_statuses)[number];
export type PaymentMethod = (typeof payment_methods)[number];

export function is_active_delivery_task_status(status: DeliveryTaskStatus): boolean {
  return (active_delivery_task_statuses as readonly string[]).includes(status);
}
