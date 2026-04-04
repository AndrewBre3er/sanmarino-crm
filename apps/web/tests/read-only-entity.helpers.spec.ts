import { describe, expect, it } from "vitest";
import {
  build_status_summary,
  format_datetime,
  format_list_meta_caption,
  format_optional
} from "../src/features/backoffice-read/read-only-entity.helpers";

describe("read-only entity helpers", () => {
  it("builds status summary sorted by count", () => {
    const summary = build_status_summary(
      [
        { status: "draft" },
        { status: "draft" },
        { status: "won" },
        { status: "negotiation" }
      ],
      item => item.status
    );

    expect(summary).toEqual([
      { status: "draft", count: 2 },
      { status: "negotiation", count: 1 },
      { status: "won", count: 1 }
    ]);
  });

  it("formats pagination caption from api meta", () => {
    const caption = format_list_meta_caption({
      pagination: {
        mode: "page",
        page: {
          page: 2,
          pageSize: 20,
          totalItems: 55,
          totalPages: 3
        }
      }
    });

    expect(caption).toContain("Page 2 / 3");
    expect(caption).toContain("page size 20");
    expect(caption).toContain("total 55");
  });

  it("formats optional and datetime values for detail blocks", () => {
    expect(format_optional("")).toBe("-");
    expect(format_optional("value")).toBe("value");
    expect(format_optional(null)).toBe("-");
    expect(format_datetime("not-a-date")).toBe("not-a-date");
    expect(format_datetime(null)).toBe("-");
  });
});

