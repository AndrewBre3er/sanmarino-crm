import type { OrderFulfillmentType } from "./status.contract";

export interface OrderFulfillmentInvariantInput {
  orderId: string;
  fulfillmentType: OrderFulfillmentType;
  activeDeliveryTaskCount: number;
}

export interface OrderFulfillmentInvariantOptions {
  enteringDeliveryFlow: boolean;
}

export class OrderFulfillmentInvariantError extends Error {
  constructor(readonly orderId: string, message: string) {
    super(message);
    this.name = "OrderFulfillmentInvariantError";
  }
}

export function assert_order_fulfillment_invariant(
  input: OrderFulfillmentInvariantInput,
  options: OrderFulfillmentInvariantOptions
): void {
  if (input.fulfillmentType === "pickup" && input.activeDeliveryTaskCount > 0) {
    throw new OrderFulfillmentInvariantError(
      input.orderId,
      "pickup order must have 0 active delivery tasks"
    );
  }

  if (!options.enteringDeliveryFlow) {
    return;
  }

  if (input.fulfillmentType === "delivery" && input.activeDeliveryTaskCount < 1) {
    throw new OrderFulfillmentInvariantError(
      input.orderId,
      "delivery order must have at least 1 active delivery task before entering delivery flow"
    );
  }

  if (input.fulfillmentType === "manual") {
    throw new OrderFulfillmentInvariantError(
      input.orderId,
      "manual fulfillment type is temporary and restricted; TODO: replace with explicit delivery/pickup before delivery flow"
    );
  }
}
