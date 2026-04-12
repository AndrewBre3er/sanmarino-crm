import { describe, expect, it } from "vitest";
import { api_error_codes } from "../../src/common/errors/api-error.contract";
import { api_openapi_contract, api_openapi_extensions } from "../../src/contracts/openapi.contract";

describe("api shell integration contracts", () => {
  it("keeps openapi shell metadata aligned with infra contracts", () => {
    expect(api_openapi_contract.version).toBe("0.14.0");
    expect(api_openapi_extensions.declaredErrorCodes).toEqual(api_error_codes);
    expect(api_openapi_extensions.requestContextHeaders.requestId).toBe("X-Request-Id");
    expect(api_openapi_extensions.idempotencyHeaderContract.header).toBe("Idempotency-Key");
    expect(api_openapi_extensions.bootstrapPhase).toBe(
      "phase-15-logistics-fulfillment-contract-freeze"
    );
    expect(api_openapi_extensions.paymentsCommandSurface.createPayment.path).toBe("/payments");
    expect(
      api_openapi_extensions.logisticsFulfillmentResourceSurface.deliverySlots.create.path
    ).toBe("/delivery-slots");
    expect(api_openapi_extensions.logisticsFulfillmentCommandSurface.createDeliveryTask.path).toBe(
      "/delivery-tasks"
    );
    expect(
      api_openapi_extensions.logisticsFulfillmentBoundaryRules.orderToDeliveryTaskCardinality
    ).toBe("1_to_many");
    expect(
      api_openapi_extensions.logisticsFulfillmentEventSurface.orderDeliveryStatusAggregated
    ).toBe("order.delivery_status_aggregated");
  });
});
