import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { resolve_delivery_task_read_scope } from "../../src/modules/read-side/logistics/delivery-task.read.scope";

describe("delivery task read scope", () => {
  it("keeps seller scoped to own responsibleUserId", () => {
    const scope = resolve_delivery_task_read_scope({
      userId: "seller_1",
      roleCodes: ["seller"]
    });

    expect(scope).toEqual({ responsibleUserId: "seller_1" });
  });

  it("keeps logistics/admin/ceo as unscoped readers", () => {
    expect(
      resolve_delivery_task_read_scope({
        userId: "logistics_1",
        roleCodes: ["logistics"]
      })
    ).toBeUndefined();

    expect(
      resolve_delivery_task_read_scope({
        userId: "admin_1",
        roleCodes: ["admin"]
      })
    ).toBeUndefined();

    expect(
      resolve_delivery_task_read_scope({
        userId: "ceo_1",
        roleCodes: ["ceo"]
      })
    ).toBeUndefined();
  });

  it("forbids non-baseline role from delivery-task read surface", () => {
    expect(() =>
      resolve_delivery_task_read_scope({
        userId: "warehouse_1",
        roleCodes: ["warehouse"]
      })
    ).toThrow(ForbiddenException);
  });
});

