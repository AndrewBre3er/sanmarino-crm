-- AlterTable
ALTER TABLE "finance"."finance_entries"
ADD COLUMN "expense_id" UUID,
ADD COLUMN "marketing_expense_id" UUID;

-- CreateIndex
CREATE INDEX "finance_entries_expense_id_idx" ON "finance"."finance_entries"("expense_id");

-- CreateIndex
CREATE INDEX "finance_entries_marketing_expense_id_idx" ON "finance"."finance_entries"("marketing_expense_id");

-- AddForeignKey
ALTER TABLE "finance"."finance_entries" ADD CONSTRAINT "finance_entries_expense_id_fkey"
FOREIGN KEY ("expense_id") REFERENCES "finance"."expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."finance_entries" ADD CONSTRAINT "finance_entries_marketing_expense_id_fkey"
FOREIGN KEY ("marketing_expense_id") REFERENCES "finance"."marketing_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;