import { afterEach, describe, expect, it, vi } from "vitest";
import {
  build_read_collection_url,
  build_read_detail_url,
  fetch_leads_collection,
  resolve_read_api_base_url
} from "../src/lib/read-api-client";

describe("read api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes api base url", () => {
    expect(resolve_read_api_base_url("http://localhost:4000/api/")).toBe(
      "http://localhost:4000/api"
    );
    expect(resolve_read_api_base_url("")).toBe("http://localhost:4000/api");
  });

  it("builds collection and detail urls with query params", () => {
    const collection_url = build_read_collection_url(
      "orders",
      {
        page: 2,
        pageSize: 50,
        search: "ORD-",
        status: ["draft", "confirmed"],
        sortBy: "createdAt",
        sortDirection: "desc"
      },
      "http://localhost:4000/api"
    );

    expect(collection_url).toContain("/orders?");
    expect(collection_url).toContain("page=2");
    expect(collection_url).toContain("pageSize=50");
    expect(collection_url).toContain("search=ORD-");
    expect(collection_url).toContain("status=draft%2Cconfirmed");
    expect(collection_url).toContain("sortBy=createdAt");
    expect(collection_url).toContain("sortDirection=desc");

    const detail_url = build_read_detail_url("payments", "pay_123", "http://localhost:4000/api");
    expect(detail_url).toBe("http://localhost:4000/api/payments/pay_123");
  });

  it("extracts api error message from error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "NOT_FOUND",
              message: "Lead 'missing' was not found"
            }
          }),
          {
            status: 404,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
    );

    await expect(fetch_leads_collection()).rejects.toThrow("Lead 'missing' was not found");
  });
});
