import { Module } from "@nestjs/common";
import { PrismaCrmLeadReadRepository } from "../read-side/crm/lead.read.repository";
import { PrismaCrmLeadRepository } from "../transactional/crm/lead.repository";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, PrismaCrmLeadReadRepository, PrismaCrmLeadRepository]
})
export class LeadsModule {}
