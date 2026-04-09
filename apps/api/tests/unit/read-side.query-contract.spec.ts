import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  build_page_pagination_meta,
  build_read_collection_query,
  type DealsReadQueryDto,
  type OrdersReadQueryDto
} from "../../src/modules/read-side/shared/read-query.dto";

describe("read-side query contracts", () => {
  it("builds page contract with defaults and safe sort fallback", () => {
    const dto: DealsReadQueryDto = {
      search: "pipeline",
      sortBy: "unsupported_field",
      status: ["in_progress"]
    };

    const query = build_read_collection_query(dto, {
      defaultSortField: "updatedAt",
      allowedSortFields: ["updatedAt", "createdAt", "status", "title"],
      statusField: "status",
      statusValues: dto.status
    });

    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(20);
    expect(query.sortField).toBe("updatedAt");
    expect(query.sortDirection).toBe("desc");
    expect(query.status).toEqual(["in_progress"]);
    expect(query.contract.pagination?.mode).toBe("page");
    expect(query.contract.filters?.[0]).toEqual({
      field: "status",
      operator: "eq",
      value: "in_progress"
    });
  });

  it("creates an in-filter for multi-status query", () => {
    const dto: OrdersReadQueryDto = {
      page: 2,
      pageSize: 10,
      sortBy: "createdAt",
      sortDirection: "asc",
      status: ["confirmed", "reserved"]
    };

    const query = build_read_collection_query(dto, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "status"],
      statusField: "status",
      statusValues: dto.status
    });

    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
    expect(query.contract.filters?.[0]).toEqual({
      field: "status",
      operator: "in",
      value: ["confirmed", "reserved"]
    });
  });

  it("builds page metadata with totals", () => {
    const meta = build_page_pagination_meta(45, 3, 20);

    expect(meta).toEqual({
      page: 3,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3
    });
  });
});
