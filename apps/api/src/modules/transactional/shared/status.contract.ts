export const deal_statuses = ["in_progress", "converted_to_order", "cancelled"] as const;

export const lead_statuses = ["new", "in_processing", "cancelled"] as const;

export const order_statuses = [
  "assembling",
  "ready_for_partial_shipment",
  "ready_for_shipment",
  "partially_shipped",
  "shipped"
] as const;

export const order_control_overlay_statuses = ["none", "on_control", "problem"] as const;

export const order_delivery_statuses = [
  "not_scheduled",
  "scheduled",
  "partially_delivered",
  "delivered",
  "failed"
] as const;

export const order_fulfillment_types = ["delivery", "pickup", "manual"] as const;

export const fulfillment_statuses = ["pending", "completed", "failed", "cancelled"] as const;

export const delivery_task_statuses = [
  "planned",
  "assigned",
  "in_transit",
  "delivered",
  "failed",
  "rescheduled"
] as const;

export const logistics_slot_statuses = ["open", "held", "booked", "closed"] as const;

export const logistics_route_day_statuses = ["planned", "active", "closed", "cancelled"] as const;

export const return_request_statuses = ["created", "confirmed", "processed", "closed"] as const;

export const supplier_request_statuses = [
  "formed",
  "confirmed_by_supplier",
  "paid",
  "stocked"
] as const;

export const product_units = ["шт", "кв.м", "п.м", "услуга"] as const;

export const stock_lock_statuses = ["active", "expired", "released", "promoted"] as const;

export const reservation_statuses = [
  "active",
  "released",
  "expired",
  "consumed",
  "cancelled"
] as const;

export const inventory_movement_types = [
  "receipt",
  "issue",
  "return_to_stock",
  "writeoff",
  "adjustment",
  "reservation_create",
  "reservation_release",
  "transfer_to_quarantine",
  "release_from_quarantine"
] as const;

export const inventory_bucket_statuses = [
  "on_hand",
  "reserved",
  "available",
  "quarantine"
] as const;

export const payment_statuses = ["pending", "completed", "refunded"] as const;

export const payment_methods = ["cash", "bank_transfer", "card", "sbp", "other"] as const;

export const cash_operation_types = ["cash_in", "cash_out", "refund"] as const;

export const finance_entry_types = ["income", "expense", "adjustment"] as const;

export const expense_types = [
  "operational",
  "marketing",
  "procurement",
  "logistics",
  "other"
] as const;

export const finance_correction_statuses = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "applied"
] as const;

export const active_delivery_task_statuses = [
  "planned",
  "assigned",
  "in_transit",
  "rescheduled"
] as const;

export type DealStatus = (typeof deal_statuses)[number];
export type LeadStatus = (typeof lead_statuses)[number];
export type OrderStatus = (typeof order_statuses)[number];
export type OrderControlOverlayStatus = (typeof order_control_overlay_statuses)[number];
export type OrderDeliveryStatus = (typeof order_delivery_statuses)[number];
export type OrderFulfillmentType = (typeof order_fulfillment_types)[number];
export type FulfillmentStatus = (typeof fulfillment_statuses)[number];
export type DeliveryTaskStatus = (typeof delivery_task_statuses)[number];
export type LogisticsSlotStatus = (typeof logistics_slot_statuses)[number];
export type LogisticsRouteDayStatus = (typeof logistics_route_day_statuses)[number];
export type ReturnRequestStatus = (typeof return_request_statuses)[number];
export type SupplierRequestStatus = (typeof supplier_request_statuses)[number];
export type ProductUnit = (typeof product_units)[number];
export type StockLockStatus = (typeof stock_lock_statuses)[number];
export type ReservationStatus = (typeof reservation_statuses)[number];
export type InventoryMovementType = (typeof inventory_movement_types)[number];
export type InventoryBucketStatus = (typeof inventory_bucket_statuses)[number];
export type PaymentStatus = (typeof payment_statuses)[number];
export type PaymentMethod = (typeof payment_methods)[number];
export type CashOperationType = (typeof cash_operation_types)[number];
export type FinanceEntryType = (typeof finance_entry_types)[number];
export type ExpenseType = (typeof expense_types)[number];
export type FinanceCorrectionStatus = (typeof finance_correction_statuses)[number];

export function is_active_delivery_task_status(status: DeliveryTaskStatus): boolean {
  return (active_delivery_task_statuses as readonly string[]).includes(status);
}
