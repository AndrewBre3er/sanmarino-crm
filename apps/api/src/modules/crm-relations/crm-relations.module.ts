import { Module } from "@nestjs/common";
import { PrismaCrmDealRepository } from "../transactional/crm/deal.repository";
import { ClientParticipantsController } from "./client-participants.controller";
import { PrismaCrmClientParticipantRepository } from "./client-participants.repository";
import { ClientsController } from "./clients.controller";
import { PrismaCrmClientRepository } from "./clients.repository";
import { ContactsController } from "./contacts.controller";
import { PrismaCrmContactRepository } from "./contacts.repository";
import { CrmRelationsService } from "./crm-relations.service";

@Module({
  controllers: [ClientsController, ContactsController, ClientParticipantsController],
  providers: [
    CrmRelationsService,
    PrismaCrmClientRepository,
    PrismaCrmContactRepository,
    PrismaCrmClientParticipantRepository,
    PrismaCrmDealRepository
  ]
})
export class CrmRelationsModule {}
