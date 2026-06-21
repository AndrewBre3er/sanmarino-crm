-- CreateEnum
CREATE TYPE "payments"."CashOperationType" AS ENUM ('cash_in', 'cash_out', 'refund');

-- CreateEnum
CREATE TYPE "finance"."FinanceEntryType" AS ENUM ('income', 'expense', 'adjustment');

-- CreateEnum
CREATE TYPE "finance"."ExpenseType" AS ENUM ('operational', 'marketing', 'procurement', 'logistics', 'other');

-- AlterTable
ALTER TABLE "payments"."payments"
ADD COLUMN "created_by" UUID NOT NULL;

-- CreateTable
CREATE TABLE "payments"."cash_operations" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "return_request_id" UUID,
    "operation_type" "payments"."CashOperationType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "performed_at" TIMESTAMPTZ(6) NOT NULL,
    "external_reference" VARCHAR(255),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cash_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."finance_entries" (
    "id" UUID NOT NULL,
    "entry_type" "finance"."FinanceEntryType" NOT NULL,
    "order_id" UUID,
    "payment_id" UUID,
    "cash_operation_id" UUID,
    "return_request_id" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "recognized_at" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."expenses" (
    "id" UUID NOT NULL,
    "expense_type" "finance"."ExpenseType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT,
    "related_order_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."marketing_expenses" (
    "id" UUID NOT NULL,
    "source" VARCHAR(128) NOT NULL,
    "campaign" VARCHAR(255),
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marketing_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_created_by_idx" ON "payments"."payments"("created_by");

-- CreateIndex
CREATE INDEX "cash_operations_payment_id_idx" ON "payments"."cash_operations"("payment_id");

-- CreateIndex
CREATE INDEX "cash_operations_return_request_id_idx" ON "payments"."cash_operations"("return_request_id");

-- CreateIndex
CREATE INDEX "cash_operations_performed_at_idx" ON "payments"."cash_operations"("performed_at");

-- CreateIndex
CREATE INDEX "finance_entries_entry_type_idx" ON "finance"."finance_entries"("entry_type");

-- CreateIndex
CREATE INDEX "finance_entries_payment_id_idx" ON "finance"."finance_entries"("payment_id");

-- CreateIndex
CREATE INDEX "finance_entries_recognized_at_idx" ON "finance"."finance_entries"("recognized_at");

-- CreateIndex
CREATE INDEX "expenses_expense_type_idx" ON "finance"."expenses"("expense_type");

-- CreateIndex
CREATE INDEX "expenses_occurred_at_idx" ON "finance"."expenses"("occurred_at");

-- CreateIndex
CREATE INDEX "marketing_expenses_source_idx" ON "finance"."marketing_expenses"("source");

-- CreateIndex
CREATE INDEX "marketing_expenses_occurred_at_idx" ON "finance"."marketing_expenses"("occurred_at");

-- AddForeignKey
ALTER TABLE "payments"."payments" ADD CONSTRAINT "payments_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."cash_operations" ADD CONSTRAINT "cash_operations_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."cash_operations" ADD CONSTRAINT "cash_operations_return_request_id_fkey"
FOREIGN KEY ("return_request_id") REFERENCES "orders"."return_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."cash_operations" ADD CONSTRAINT "cash_operations_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."finance_entries" ADD CONSTRAINT "finance_entries_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."finance_entries" ADD CONSTRAINT "finance_entries_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."finance_entries" ADD CONSTRAINT "finance_entries_cash_operation_id_fkey"
FOREIGN KEY ("cash_operation_id") REFERENCES "payments"."cash_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."finance_entries" ADD CONSTRAINT "finance_entries_return_request_id_fkey"
FOREIGN KEY ("return_request_id") REFERENCES "orders"."return_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."finance_entries" ADD CONSTRAINT "finance_entries_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."expenses" ADD CONSTRAINT "expenses_related_order_id_fkey"
FOREIGN KEY ("related_order_id") REFERENCES "orders"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."expenses" ADD CONSTRAINT "expenses_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."marketing_expenses" ADD CONSTRAINT "marketing_expenses_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contract checks
ALTER TABLE "payments"."cash_operations"
ADD CONSTRAINT "cash_operations_refund_requires_return_request_check"
CHECK (
  "operation_type" <> 'refund'
  OR "return_request_id" IS NOT NULL
);

ALTER TABLE "finance"."finance_entries"
ADD CONSTRAINT "finance_entries_income_requires_payment_check"
CHECK (
  "entry_type" <> 'income'
  OR "payment_id" IS NOT NULL
);
