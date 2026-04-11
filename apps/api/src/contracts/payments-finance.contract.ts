export const payments_finance_entities = [
  "payment",
  "cash_operation",
  "finance_entry",
  "expense",
  "marketing_expense"
] as const;

export const payments_finance_status_contract = {
  payment: ["pending", "completed", "refunded"] as const,
  paymentMethod: ["cash", "bank_transfer", "card", "sbp", "other"] as const,
  cashOperation: ["cash_in", "cash_out", "refund"] as const,
  financeEntryType: ["income", "expense", "adjustment"] as const,
  expenseType: ["operational", "marketing", "procurement", "logistics", "other"] as const
} as const;

export const payments_finance_command_contract = {
  createPayment: {
    method: "POST",
    path: "/payments",
    requiresIdempotencyKey: true
  },
  completePayment: {
    method: "POST",
    path: "/payments/:paymentId/complete",
    requiresIdempotencyKey: true
  },
  createRefund: {
    method: "POST",
    path: "/payments/:paymentId/refunds",
    requiresIdempotencyKey: true,
    requiresReturnRequestId: true
  }
} as const;

export const payments_finance_income_rules_contract = {
  incomeRecognitionSourceEvent: "payment.completed" as const,
  forbidsIncomeFromOrderStatus: true as const,
  forbidsIncomeFromShipment: true as const,
  refundRequiresReturnRequest: true as const,
  manualIncomeCreationPublicApi: "forbidden" as const
} as const;

export const payments_finance_event_contract = {
  paymentCompleted: "payment.completed" as const,
  paymentRefundCompleted: "payment.refund_completed" as const,
  financeRevenueRecognized: "finance.revenue_recognized" as const,
  financeExpenseRecorded: "finance.expense_recorded" as const
} as const;

export const payments_finance_out_of_scope_contract = {
  returnsImplementation: "deferred" as const,
  logisticsImplementation: "deferred" as const,
  workerConsumers: "deferred" as const,
  reconciliationJobs: "deferred" as const
} as const;

