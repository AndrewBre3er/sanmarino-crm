import { describe, expect, it } from "vitest";
import {
  normalize_persistence_limit,
  prisma_repository_conventions
} from "../../src/common/persistence/prisma-repository.conventions";

describe("prisma repository conventions", () => {
  it("keeps expected provider and transaction defaults", () => {
    expect(prisma_repository_conventions.provider).toBe("prisma");
    expect(prisma_repository_conventions.transaction.driver).toBe("$transaction");
    expect(prisma_repository_conventions.transaction.defaultIsolationLevel).toBe(
      "read_committed"
    );
  });

  it("normalizes pagination limits into bounded range", () => {
    expect(normalize_persistence_limit()).toBe(50);
    expect(normalize_persistence_limit({ limit: 500 })).toBe(200);
    expect(normalize_persistence_limit({ limit: 0 })).toBe(1);
  });
});

