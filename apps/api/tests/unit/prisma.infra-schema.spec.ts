import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function load_schema(): string {
  const schema_path = path.resolve(process.cwd(), "prisma/schema.prisma");
  return readFileSync(schema_path, "utf8");
}

describe("prisma schema foundation (infra + minimal core transactional)", () => {
  it("contains approved infra/system models and minimal core transactional models only", () => {
    const schema = load_schema();

    expect(schema).toContain("model SystemIdempotencyRecord");
    expect(schema).toContain("model SystemOutboxRecord");
    expect(schema).toContain("model AuditLogRecord");
    expect(schema).toContain("model CrmLead");
    expect(schema).toContain("model CrmDeal");
    expect(schema).toContain("model OrdersOrder");
    expect(schema).toContain("model OrdersOrderItem");
    expect(schema).toContain("model LogisticsDeliveryTask");
    expect(schema).toContain("model OrdersReturnRequest");
    expect(schema).toContain("model PaymentsPayment");

    const forbidden_deferred_models = [
      "model InventoryStockBalance",
      "model InventoryReservation",
      "model FinanceEntry",
      "model AnalyticsLiveKpiMetric",
      "model UsersUser",
      "model MarketingExpense"
    ];

    for (const model_name of forbidden_deferred_models) {
      expect(schema).not.toContain(model_name);
    }
  });

  it("keeps TODO marker for deferred remaining business schema", () => {
    const schema = load_schema();
    expect(schema).toContain(
      "TODO(implementation): add remaining business models only in their dedicated domain phases."
    );
  });
});
