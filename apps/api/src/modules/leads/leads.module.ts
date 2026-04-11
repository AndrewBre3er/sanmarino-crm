import { Module } from "@nestjs/common";
import { PrismaCrmLeadReadRepository } from "../read-side/crm/lead.read.repository";
import { PrismaCrmDealRepository } from "../transactional/crm/deal.repository";
import { PrismaCrmLeadRepository } from "../transactional/crm/lead.repository";
import { PrismaOrdersOrderRepository } from "../transactional/orders/order.repository";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    PrismaCrmLeadReadRepository,
    PrismaCrmLeadRepository,
    PrismaCrmDealRepository,
    PrismaOrdersOrderRepository
  ]
})
export class LeadsModule {}
