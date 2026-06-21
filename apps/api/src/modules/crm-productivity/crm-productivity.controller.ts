import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import { CrmProductivityService } from "./crm-productivity.service";

class SetDealFollowUpDto {
  @IsDateString()
  nextContactAt!: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}

class LogDealCommunicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  channel!: string;

  @IsIn(["inbound", "outbound"])
  direction!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  summary!: string;

  @IsDateString()
  occurredAt!: string;
}

class MarkDealLostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lostReason!: string;
}

class MarkDealStuckDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  reason!: string;
}

@ApiTags(api_openapi_tags.crmRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "admin", "ceo")
@Controller("deals/:dealId")
export class CrmProductivityController {
  constructor(
    @Inject(CrmProductivityService)
    private readonly crmProductivityService: CrmProductivityService
  ) {}

  @Post("follow-ups")
  async setFollowUp(
    @Param("dealId") dealId: string,
    @Body() payload: SetDealFollowUpDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const followUp = await this.crmProductivityService.setDealFollowUp(
      dealId,
      payload,
      access.user
    );
    return { data: followUp };
  }

  @Get("follow-ups")
  async listFollowUps(
    @Param("dealId") dealId: string,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const followUps = await this.crmProductivityService.listDealFollowUps(
      dealId,
      access.user
    );
    return { data: followUps };
  }

  @Post("communications")
  async logCommunication(
    @Param("dealId") dealId: string,
    @Body() payload: LogDealCommunicationDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const communication = await this.crmProductivityService.logDealCommunication(
      dealId,
      payload,
      access.user
    );
    return { data: communication };
  }

  @Get("communications")
  async listCommunications(
    @Param("dealId") dealId: string,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const communications = await this.crmProductivityService.listDealCommunications(
      dealId,
      access.user
    );
    return { data: communications };
  }

  @Post("mark-lost")
  async markLost(
    @Param("dealId") dealId: string,
    @Body() payload: MarkDealLostDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const updated = await this.crmProductivityService.markDealLost(
      dealId,
      payload,
      access.user
    );
    return { data: updated };
  }

  @Post("mark-stuck")
  async markStuck(
    @Param("dealId") dealId: string,
    @Body() payload: MarkDealStuckDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const updated = await this.crmProductivityService.markDealStuck(
      dealId,
      payload,
      access.user
    );
    return { data: updated };
  }
}
