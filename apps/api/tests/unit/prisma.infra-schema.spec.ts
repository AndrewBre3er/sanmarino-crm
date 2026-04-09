import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function load_schema(): string {
  const schema_path = path.resolve(process.cwd(), "prisma/schema.prisma");
  return readFileSync(schema_path, "utf8");
}

describe("prisma schema foundation (infra + users + CRM core + supply inventory contract baseline)", () => {
  it("contains approved infra/system models, users models, and supply/inventory foundation models", () => {
    const schema = load_schema();

    expect(schema).toContain("model SystemIdempotencyRecord");
    expect(schema).toContain("model SystemOutboxRecord");
    expect(schema).toContain("model AuditLogRecord");
    expect(schema).toContain("enum RecordStatus");
    expect(schema).toContain("model UsersDepartment");
    expect(schema).toContain("model UsersRole");
    expect(schema).toContain("model UsersPermission");
    expect(schema).toContain("model UsersRolePermission");
    expect(schema).toContain("model UsersUser");
    expect(schema).toContain("model UsersUserRole");
    expect(schema).toContain("model CrmClient");
    expect(schema).toContain("model CrmContact");
    expect(schema).toContain("model CrmLead");
    expect(schema).toContain("model CrmDeal");
    expect(schema).toContain("model CrmClientParticipant");
    expect(schema).toContain("model OrdersOrder");
    expect(schema).toContain("model OrdersOrderItem");
    expect(schema).toContain("model LogisticsDeliveryTask");
    expect(schema).toContain("model OrdersReturnRequest");
    expect(schema).toContain("model PaymentsPayment");
    expect(schema).toContain("model InventorySupplier");
    expect(schema).toContain("model InventorySupplierRequest");
    expect(schema).toContain("model InventorySupplierRequestItem");
    expect(schema).toContain("model InventoryPurchaseReceipt");
    expect(schema).toContain("model InventoryPurchaseReceiptItem");
    expect(schema).toContain("model InventoryProduct");
    expect(schema).toContain("model InventoryWarehouse");
    expect(schema).toContain("model InventoryStockBalance");
    expect(schema).toContain("model InventoryStockLock");
    expect(schema).toContain("model InventoryReservation");
    expect(schema).toContain("model InventoryInventoryMovement");
    expect(schema).toContain("enum LeadStatus");
    expect(schema).toContain('NEW           @map("new")');
    expect(schema).toContain("enum DealStatus");
    expect(schema).toContain('IN_PROGRESS        @map("in_progress")');
    expect(schema).toContain('CONVERTED_TO_ORDER @map("converted_to_order")');
    expect(schema).toContain('clientId          String?    @map("client_id") @db.Uuid');
    expect(schema).toContain('contactId         String?    @map("contact_id") @db.Uuid');
    expect(schema).toContain('clientId          String      @map("client_id") @db.Uuid');
    expect(schema).toContain('roleType  String      @map("role_type") @db.VarChar(32)');
    expect(schema).toContain("enum OrderStatus");
    expect(schema).toContain('ASSEMBLING                 @map("assembling")');
    expect(schema).toContain("enum ReturnRequestStatus");
    expect(schema).toContain('CREATED   @map("created")');
    expect(schema).toContain("enum SupplierRequestStatus");
    expect(schema).toContain('FORMED                @map("formed")');
    expect(schema).toContain("enum ProductUnit");
    expect(schema).toContain('PIECE        @map("шт")');
    expect(schema).toContain("enum StockLockStatus");
    expect(schema).toContain('ACTIVE   @map("active")');
    expect(schema).toContain("enum ReservationStatus");
    expect(schema).toContain('CONSUMED  @map("consumed")');
    expect(schema).toContain("enum InventoryMovementType");
    expect(schema).toContain('TRANSFER_TO_QUARANTINE  @map("transfer_to_quarantine")');
    expect(schema).toContain("enum InventoryBucket");
    expect(schema).toContain('QUARANTINE @map("quarantine")');
    expect(schema).toContain("enum OrderFulfillmentType");
    expect(schema).toContain('fulfillmentType OrderFulfillmentType');
    expect(schema).toContain('businessSourceType');
    expect(schema).toContain('@map("business_source_type")');
    expect(schema).toContain('businessSourceId');
    expect(schema).toContain('@map("business_source_id")');
    expect(schema).toContain('sourceLineRef');
    expect(schema).toContain('@map("source_line_ref")');
    expect(schema).toContain('sourceLineContext');
    expect(schema).toContain('@map("source_line_context")');
    expect(schema).toContain('supplierId');
    expect(schema).toContain('@map("supplier_id")');
    expect(schema).toContain('supplierRequestId');
    expect(schema).toContain('@map("supplier_request_id")');
    expect(schema).toContain('supplierRequestItemId');
    expect(schema).toContain('@map("supplier_request_item_id")');
    expect(schema).toContain('requiresCeoApproval');
    expect(schema).toContain('@map("requires_ceo_approval")');

    const forbidden_deferred_models = [
      "model FinanceEntry",
      "model AnalyticsLiveKpiMetric",
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
    expect(schema).toContain(
      "TODO(phase9+): enforce delivery(1..N tasks)/pickup(0 tasks) invariant in transaction/domain layer."
    );
  });
});
