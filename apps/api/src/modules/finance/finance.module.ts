import { Module } from "@nestjs/common";
import { ExpensesController } from "./expenses.controller";
import { FinanceCorrectionsController } from "./finance-corrections.controller";
import { FinanceService } from "./finance.service";
import { MarketingExpensesController } from "./marketing-expenses.controller";

@Module({
  controllers: [ExpensesController, MarketingExpensesController, FinanceCorrectionsController],
  providers: [FinanceService]
})
export class FinanceModule {}
