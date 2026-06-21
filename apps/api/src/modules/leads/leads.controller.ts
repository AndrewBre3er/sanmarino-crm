import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from "class-validator";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import { lead_statuses, type LeadStatus } from "../transactional/shared/status.contract";
import { LeadsService } from "./leads.service";
import type {
  LeadsReadQueryDto
} from "../read-side/shared/read-query.dto";
import {
  build_read_collection_query
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";

class CreateLeadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  source!: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

class UpdateLeadStatusDto {
  @IsIn(lead_statuses)
  status!: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@ApiTags(api_openapi_tags.crmLeads.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "admin", "ceo")
@Controller("leads")
export class LeadsController {
  constructor(@Inject(LeadsService) private readonly leadsService: LeadsService) {}

  @Get()
  async list(@Query() query: LeadsReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "source", "status"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.leadsService.listLeads(
      readQuery,
      query.responsibleUserId,
      access.user
    );
    return to_read_collection_response(result);
  }

  @Get(":leadId")
  async detail(@Param("leadId") leadId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const lead = await this.leadsService.getLead(leadId, access.user);
    return { data: lead };
  }

  @Post()
  async create(@Body() payload: CreateLeadDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const lead = await this.leadsService.createLead(payload, access.user);
    return { data: lead };
  }

  @Patch(":leadId/status")
  async patchStatus(
    @Param("leadId") leadId: string,
    @Body() payload: UpdateLeadStatusDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const lead = await this.leadsService.updateLeadStatus(leadId, payload, access.user);
    return { data: lead };
  }
}
