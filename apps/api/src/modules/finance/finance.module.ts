import { Module } from "@nestjs/common";
import { ExpensesController } from "./expenses.controller";
import { FinanceService } from "./finance.service";
import { MarketingExpensesController } from "./marketing-expenses.controller";

@Module({
  controllers: [ExpensesController, MarketingExpensesController],
  providers: [FinanceService]
})
export class FinanceModule {}
