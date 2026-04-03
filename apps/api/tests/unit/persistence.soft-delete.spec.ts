import { describe, expect, it } from "vitest";
import {
  build_restore_patch,
  build_soft_delete_patch,
  is_soft_deleted
} from "../../src/common/persistence/soft-delete.contract";

describe("soft-delete persistence contracts", () => {
  it("builds soft-delete patch with metadata", () => {
    const patch = build_soft_delete_patch(
      {
        actorId: "usr_123",
        reason: "cleanup"
      },
      "2026-04-03T10:00:00.000Z"
    );

    expect(patch).toEqual({
      deletedAt: "2026-04-03T10:00:00.000Z",
      deletedBy: "usr_123",
      deleteReason: "cleanup",
      isDeleted: true
    });
  });

  it("detects soft-deleted state by deletedAt or marker", () => {
    expect(is_soft_deleted({ deletedAt: "2026-04-03T10:00:00.000Z" })).toBe(true);
    expect(is_soft_deleted({ isDeleted: true })).toBe(true);
    expect(is_soft_deleted({ deletedAt: null, isDeleted: false })).toBe(false);
  });

  it("builds restore patch", () => {
    expect(build_restore_patch()).toEqual({
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      isDeleted: false
    });
  });
});

