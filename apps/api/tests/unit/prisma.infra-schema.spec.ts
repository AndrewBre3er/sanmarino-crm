import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function load_schema(): string {
  const schema_path = path.resolve(process.cwd(), "prisma/schema.prisma");
  return readFileSync(schema_path, "utf8");
}

describe("prisma infra/system schema foundation", () => {
  it("contains only approved infra/system models in current phase", () => {
    const schema = load_schema();

    expect(schema).toContain("model SystemIdempotencyRecord");
    expect(schema).toContain("model SystemOutboxRecord");
    expect(schema).toContain("model AuditLogRecord");

    const forbidden_business_models = [
      "model Lead",
      "model Deal",
      "model Order",
      "model Payment",
      "model Inventory",
      "model DeliveryTask",
      "model FinanceEntry",
      "model User"
    ];

    for (const model_name of forbidden_business_models) {
      expect(schema).not.toContain(model_name);
    }
  });

  it("keeps TODO marker for deferred business schema", () => {
    const schema = load_schema();
    expect(schema).toContain("TODO(implementation): add business models only when domain implementation phase starts.");
  });
});

