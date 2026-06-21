import { describe, expect, it } from "vitest";
import {
  payments_finance_command_contract,
  payments_finance_entities,
  payments_finance_event_contract,
  payments_finance_income_rules_contract,
  payments_finance_out_of_scope_contract,
  payments_finance_status_contract
} from "../../src/contracts/payments-finance.contract";
import {
  cash_operation_types,
  expense_types,
  finance_entry_types,
  payment_methods,
  payment_statuses
} from "../../src/modules/transactional/shared/status.contract";

describe("payments + finance contract freeze", () => {
  it("keeps Payments Step 1 entity scope fixed", () => {
    expect(payments_finance_entities).toEqual([
      "payment",
      "cash_operation",
      "finance_entry",
      "expense",
      "marketing_expense"
    ]);
  });

  it("keeps payment/finance enum contracts aligned with transactional status layer", () => {
    expect(payments_finance_status_contract.payment).toEqual(payment_statuses);
    expect(payments_finance_status_contract.paymentMethod).toEqual(payment_methods);
    expect(payments_finance_status_contract.cashOperation).toEqual(cash_operation_types);
    expect(payments_finance_status_contract.financeEntryType).toEqual(finance_entry_types);
    expect(payments_finance_status_contract.expenseType).toEqual(expense_types);
  });

  it("freezes command-style payment flow with idempotency requirements", () => {
    expect(payments_finance_command_contract.intakeExternalPaymentFact).toEqual({
      method: "POST",
      path: "/payments/external-facts/intake",
      requiresIdempotencyKey: true
    });

    expect(payments_finance_command_contract.confirmExternalPaymentFact).toEqual({
      method: "POST",
      path: "/payments/:paymentId/confirm-external-fact",
      requiresIdempotencyKey: true
    });

    expect(payments_finance_command_contract.rejectExternalPaymentFact).toEqual({
      method: "POST",
      path: "/payments/:paymentId/reject-external-fact",
      requiresIdempotencyKey: true
    });

    expect(payments_finance_command_contract.createRefund).toEqual({
      method: "POST",
      path: "/payments/:paymentId/refunds",
      requiresIdempotencyKey: true,
      requiresReturnRequestId: true
    });
  });

  it("freezes source-of-truth money rules for income/refund flow", () => {
    expect(payments_finance_income_rules_contract.incomeRecognitionSourceEvent).toBe(
      "payment.completed"
    );
    expect(payments_finance_income_rules_contract.forbidsIncomeFromOrderStatus).toBe(true);
    expect(payments_finance_income_rules_contract.forbidsIncomeFromShipment).toBe(true);
    expect(payments_finance_income_rules_contract.refundRequiresReturnRequest).toBe(true);
    expect(payments_finance_income_rules_contract.manualIncomeCreationPublicApi).toBe("forbidden");
  });

  it("freezes payment+finance event surface required for this stage", () => {
    expect(payments_finance_event_contract).toEqual({
      paymentExternalFactIntaked: "payment.external_fact_intaked",
      paymentExternalFactConfirmed: "payment.external_fact_confirmed",
      paymentExternalFactRejected: "payment.external_fact_rejected",
      paymentCompleted: "payment.completed",
      paymentRefundCompleted: "payment.refund_completed",
      financeRevenueRecognized: "finance.revenue_recognized",
      financeExpenseRecorded: "finance.expense_recorded"
    });
  });

  it("keeps adjacent domains explicitly deferred in Payments Step 1", () => {
    expect(payments_finance_out_of_scope_contract.returnsImplementation).toBe("deferred");
    expect(payments_finance_out_of_scope_contract.logisticsImplementation).toBe("deferred");
    expect(payments_finance_out_of_scope_contract.workerConsumers).toBe("deferred");
    expect(payments_finance_out_of_scope_contract.reconciliationJobs).toBe("deferred");
  });
});
