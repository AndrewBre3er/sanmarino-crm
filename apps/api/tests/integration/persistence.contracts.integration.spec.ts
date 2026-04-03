import { describe, expect, it } from "vitest";
import {
  idempotency_statuses,
  outbox_statuses,
  persistence_base_field_conventions,
  transaction_isolation_levels
} from "../../src/common/persistence";

describe("persistence foundation contracts", () => {
  it("exposes base field conventions", () => {
    expect(persistence_base_field_conventions.id).toBe("id");
    expect(persistence_base_field_conventions.createdAt).toBe("created_at");
    expect(persistence_base_field_conventions.deletedAt).toBe("deleted_at");
  });

  it("keeps idempotency/outbox status skeletons", () => {
    expect(idempotency_statuses).toEqual(["started", "completed", "failed"]);
    expect(outbox_statuses).toContain("pending");
    expect(outbox_statuses).toContain("dead_letter");
  });

  it("keeps supported transaction isolation placeholders", () => {
    expect(transaction_isolation_levels).toContain("read_committed");
    expect(transaction_isolation_levels).toContain("serializable");
  });
});

