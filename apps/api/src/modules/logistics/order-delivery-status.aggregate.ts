import type { DeliveryTaskStatus, OrderDeliveryStatus } from "../transactional/shared/status.contract";

export function aggregate_order_delivery_status_from_tasks(
  taskStatuses: readonly DeliveryTaskStatus[]
): OrderDeliveryStatus {
  const total = taskStatuses.length;
  if (total === 0) {
    return "not_scheduled";
  }

  const deliveredCount = taskStatuses.filter((status) => status === "delivered").length;
  if (deliveredCount === total) {
    return "delivered";
  }

  if (deliveredCount > 0) {
    return "partially_delivered";
  }

  const failedCount = taskStatuses.filter((status) => status === "failed").length;
  if (failedCount === total) {
    return "failed";
  }

  return "scheduled";
}

