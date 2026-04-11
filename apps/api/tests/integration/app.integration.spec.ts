import { describe, expect, it } from "vitest";
import { api_error_codes } from "../../src/common/errors/api-error.contract";
import { api_openapi_contract, api_openapi_extensions } from "../../src/contracts/openapi.contract";

describe("api shell integration contracts", () => {
  it("keeps openapi shell metadata aligned with infra contracts", () => {
    expect(api_openapi_contract.version).toBe("0.13.0");
    expect(api_openapi_extensions.declaredErrorCodes).toEqual(api_error_codes);
    expect(api_openapi_extensions.requestContextHeaders.requestId).toBe("X-Request-Id");
    expect(api_openapi_extensions.idempotencyHeaderContract.header).toBe("Idempotency-Key");
    expect(api_openapi_extensions.bootstrapPhase).toBe(
      "phase-14-payments-finance-contract-freeze"
    );
    expect(api_openapi_extensions.paymentsCommandSurface.createPayment.path).toBe("/payments");
  });
});
