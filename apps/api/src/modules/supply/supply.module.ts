import { Module } from "@nestjs/common";
import { InventoryMovementsController } from "./inventory-movements.controller";
import { PurchaseReceiptsController } from "./purchase-receipts.controller";
import { ReservationsController } from "./reservations.controller";
import { StockLocksController } from "./stock-locks.controller";
import { SupplierRequestsController } from "./supplier-requests.controller";
import { SuppliersController } from "./suppliers.controller";
import { PrismaSupplyRepository } from "./supply.repository";
import { SupplyService } from "./supply.service";

@Module({
  controllers: [
    SuppliersController,
    SupplierRequestsController,
    PurchaseReceiptsController,
    StockLocksController,
    ReservationsController,
    InventoryMovementsController
  ],
  providers: [SupplyService, PrismaSupplyRepository]
})
export class SupplyModule {}
