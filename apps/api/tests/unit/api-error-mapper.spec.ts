import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  is_api_error_code,
  map_http_status_to_error_code
} from "../../src/common/errors/api-error.contract";
import { normalize_exception } from "../../src/common/errors/api-error.mapper";

describe("api error mapping", () => {
  it("maps explicit contract code from HttpException payload", () => {
    const exception = new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      field: "email"
    });
    const normalized = normalize_exception(exception, exception.getStatus());

    expect(normalized.code).toBe("VALIDATION_ERROR");
    expect(normalized.message).toBe("Validation failed");
    expect(normalized.details).toEqual({ field: "email" });
  });

  it("falls back to status-based code mapping", () => {
    const exception = new NotFoundException("Item is missing");
    const normalized = normalize_exception(exception, exception.getStatus());

    expect(normalized.code).toBe("NOT_FOUND");
    expect(normalized.message).toBe("Item is missing");
  });

  it("maps unknown exception to 500-safe contract code", () => {
    const normalized = normalize_exception(new Error("boom"), 500);
    expect(normalized.code).toBe("SOURCE_OF_TRUTH_VIOLATION");
    expect(is_api_error_code(normalized.code)).toBe(true);
    expect(map_http_status_to_error_code(403)).toBe("ACCESS_DENIED");
  });
});

