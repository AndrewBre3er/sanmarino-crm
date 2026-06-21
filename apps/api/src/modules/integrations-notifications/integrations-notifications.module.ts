import { Module } from "@nestjs/common";
import { IntegrationsNotificationsController } from "./integrations-notifications.controller";
import { IntegrationsNotificationsService } from "./integrations-notifications.service";

@Module({
  controllers: [IntegrationsNotificationsController],
  providers: [IntegrationsNotificationsService],
  exports: [IntegrationsNotificationsService]
})
export class IntegrationsNotificationsModule {}
