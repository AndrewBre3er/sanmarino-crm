import { Module } from "@nestjs/common";
import { SupplierRequestsController } from "./supplier-requests.controller";
import { SuppliersController } from "./suppliers.controller";
import { PrismaSupplyRepository } from "./supply.repository";
import { SupplyService } from "./supply.service";

@Module({
  controllers: [SuppliersController, SupplierRequestsController],
  providers: [SupplyService, PrismaSupplyRepository]
})
export class SupplyModule {}
