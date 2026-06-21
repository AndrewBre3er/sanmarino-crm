import { Module } from "@nestjs/common";
import { CrmProductivityController } from "./crm-productivity.controller";
import { CrmProductivityService } from "./crm-productivity.service";

@Module({
  controllers: [CrmProductivityController],
  providers: [CrmProductivityService]
})
export class CrmProductivityModule {}
