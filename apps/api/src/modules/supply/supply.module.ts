import { Module } from "@nestjs/common";
import { PurchaseReceiptsController } from "./purchase-receipts.controller";
import { SupplierRequestsController } from "./supplier-requests.controller";
import { SuppliersController } from "./suppliers.controller";
import { PrismaSupplyRepository } from "./supply.repository";
import { SupplyService } from "./supply.service";

@Module({
  controllers: [SuppliersController, SupplierRequestsController, PurchaseReceiptsController],
  providers: [SupplyService, PrismaSupplyRepository]
})
export class SupplyModule {}
