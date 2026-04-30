import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function load_schema(): string {
  const schema_path = path.resolve(process.cwd(), "prisma/schema.prisma");
  return readFileSync(schema_path, "utf8");
}

describe("prisma schema foundation (infra + users + CRM core + orders + supply inventory + payments/finance + logistics/fulfillment contract baseline)", () => {
  it("contains approved infra/system models, users models, and logistics/fulfillment contract baseline models", () => {
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
    expect(schema).toContain("model OrdersFulfillment");
    expect(schema).toContain("model OrdersFulfillmentItem");
    expect(schema).toContain("model LogisticsDeliverySlot");
    expect(schema).toContain("model LogisticsPickupWindow");
    expect(schema).toContain("model LogisticsDriver");
    expect(schema).toContain("model LogisticsVehicle");
    expect(schema).toContain("model LogisticsRouteDay");
    expect(schema).toContain("model LogisticsDeliveryTask");
    expect(schema).toContain("model LogisticsDeliveryTaskItem");
    expect(schema).toContain("model OrdersReturnRequest");
    expect(schema).toContain("model OrdersReturnRequestItem");
    expect(schema).toContain("model PaymentsPayment");
    expect(schema).toContain("model PaymentsCashOperation");
    expect(schema).toContain("model FinanceFinanceEntry");
    expect(schema).toContain("model FinanceExpense");
    expect(schema).toContain("model FinanceMarketingExpense");
    expect(schema).toContain("model ReconciliationReport");
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
    expect(schema).toMatch(/clientId\s+String\?\s+@map\("client_id"\)\s+@db\.Uuid/);
    expect(schema).toMatch(/contactId\s+String\?\s+@map\("contact_id"\)\s+@db\.Uuid/);
    expect(schema).toMatch(/clientId\s+String\s+@map\("client_id"\)\s+@db\.Uuid/);
    expect(schema).toMatch(/roleType\s+String\s+@map\("role_type"\)\s+@db\.VarChar\(32\)/);
    expect(schema).toContain("enum OrderStatus");
    expect(schema).toContain('ASSEMBLING                 @map("assembling")');
    expect(schema).toContain("enum OrderPaymentControlStatus");
    expect(schema).toContain('ON_CONTROL @map("on_control")');
    expect(schema).toContain("enum FulfillmentStatus");
    expect(schema).toContain('PENDING   @map("pending")');
    expect(schema).toContain("enum DeliveryTaskStatus");
    expect(schema).toMatch(/PLANNED\s+@map\("planned"\)/);
    expect(schema).toContain("enum ReturnRequestStatus");
    expect(schema).toContain('CREATED   @map("created")');
    expect(schema).toContain("enum SlotStatus");
    expect(schema).toContain('OPEN   @map("open")');
    expect(schema).toContain("enum RouteDayStatus");
    expect(schema).toMatch(/PLANNED\s+@map\("planned"\)/);
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
    expect(schema).toContain("paymentControlStatus      OrderPaymentControlStatus");
    expect(schema).toContain("fulfillmentType           OrderFulfillmentType");
    expect(schema).toContain('@map("payment_control_due_at")');
    expect(schema).toContain('@map("ready_for_partial_shipment_at")');
    expect(schema).toContain('@map("ready_for_shipment_at")');
    expect(schema).toContain('@map("partially_shipped_at")');
    expect(schema).toContain('@map("shipped_at")');
    expect(schema).toContain('@map("delivery_slots")');
    expect(schema).toContain('@map("pickup_windows")');
    expect(schema).toContain('@map("route_days")');
    expect(schema).toContain('@map("delivery_tasks")');
    expect(schema).toContain('@map("delivery_task_items")');
    expect(schema).toContain("@@index([orderId, status])");
    expect(schema).toContain('@map("delivery_task_id")');
    expect(schema).toContain('@map("pickup_window_id")');
    expect(schema).toContain('@map("route_day_id")');
    expect(schema).toContain('@map("delivery_slot_id")');
    expect(schema).toContain('@map("driver_id")');
    expect(schema).toContain('@map("vehicle_id")');
    expect(schema).toMatch(/productId\s+String\s+@map\("product_id"\)\s+@db\.Uuid/);
    expect(schema).toMatch(/unit\s+ProductUnit/);
    expect(schema).toMatch(/fulfillmentId\s+String\s+@map\("fulfillment_id"\)\s+@db\.Uuid/);
    expect(schema).toContain("businessSourceType");
    expect(schema).toContain('@map("business_source_type")');
    expect(schema).toContain("businessSourceId");
    expect(schema).toContain('@map("business_source_id")');
    expect(schema).toContain("sourceLineRef");
    expect(schema).toContain('@map("source_line_ref")');
    expect(schema).toContain("sourceLineContext");
    expect(schema).toContain('@map("source_line_context")');
    expect(schema).toContain("supplierId");
    expect(schema).toContain('@map("supplier_id")');
    expect(schema).toContain("supplierRequestId");
    expect(schema).toContain('@map("supplier_request_id")');
    expect(schema).toContain("supplierRequestItemId");
    expect(schema).toContain('@map("supplier_request_item_id")');
    expect(schema).toContain("requiresCeoApproval");
    expect(schema).toContain('@map("requires_ceo_approval")');
    expect(schema).toContain("realizationAnchorAt");
    expect(schema).toContain('@map("realization_anchor_at")');
    expect(schema).toContain('@map("return_request_items")');
    expect(schema).toContain("enum CashOperationType");
    expect(schema).toContain('CASH_IN  @map("cash_in")');
    expect(schema).toContain("enum FinanceEntryType");
    expect(schema).toContain('INCOME     @map("income")');
    expect(schema).toContain("enum ExpenseType");
    expect(schema).toContain('OPERATIONAL @map("operational")');
    expect(schema).toContain("enum ReconciliationReportStatus");
    expect(schema).toContain('COMPLETED @map("completed")');
    expect(schema).toContain('@map("cash_operations")');
    expect(schema).toContain('@map("finance_entries")');
    expect(schema).toContain('@map("marketing_expenses")');
    expect(schema).toContain('@map("reports")');
    expect(schema).toContain('@@schema("reconciliation")');
    expect(schema).toContain('@map("created_by") @db.Uuid');
    expect(schema).not.toContain("model AnalyticsLiveKpiMetric");
  });

  it("keeps TODO markers for deferred business implementation around payment+finance flow", () => {
    const schema = load_schema();
    expect(schema).toContain(
      "TODO(implementation): add remaining business models only in their dedicated domain phases."
    );
    expect(schema).toContain(
      "TODO(phase9+): enforce delivery(1..N tasks)/pickup(0 tasks) invariant in transaction/domain layer."
    );
    expect(schema).toContain(
      "TODO(phase14+): wire payment completion/refund flows to finance entries via transactional use-cases and outbox events."
    );
    expect(schema).toContain(
      "TODO(phase14+): keep finance income writes internal-only and triggered from payment completion flow."
    );
    expect(schema).toContain(
      "TODO(phase15+): implement logistics command handlers, workflow orchestration, and worker consumers in dedicated slices."
    );
  });
});
