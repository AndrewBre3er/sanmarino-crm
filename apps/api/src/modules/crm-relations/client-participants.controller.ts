import {
  Body,
  Controller,
  Get,
  Param,
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
import { get_authenticated_access, type AuthenticatedRequestLike } from "../auth/auth.access.helpers";
import {
  BaseReadCollectionQueryDto,
  build_read_collection_query
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import {
  crm_client_participant_role_types,
  type CrmClientParticipantRoleType
} from "./client-participants.repository";
import { CrmRelationsService } from "./crm-relations.service";

class ClientParticipantsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsIn(crm_client_participant_role_types)
  roleType?: CrmClientParticipantRoleType;
}

class CreateClientParticipantDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsIn(crm_client_participant_role_types)
  roleType!: CrmClientParticipantRoleType;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

@ApiTags(api_openapi_tags.crmRelations.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "admin", "ceo")
@Controller("client-participants")
export class ClientParticipantsController {
  constructor(private readonly crmRelationsService: CrmRelationsService) {}

  @Get()
  async list(
    @Query() query: ClientParticipantsReadQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    void get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "name", "roleType"]
    });

    const result = await this.crmRelationsService.listClientParticipants(readQuery, {
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.roleType ? { roleType: query.roleType } : {})
    });
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() request: AuthenticatedRequestLike) {
    void get_authenticated_access(request);
    const participant = await this.crmRelationsService.getClientParticipant(id);
    return { data: participant };
  }

  @Post()
  async create(
    @Body() payload: CreateClientParticipantDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    void get_authenticated_access(request);
    const created = await this.crmRelationsService.createClientParticipant(payload);
    return { data: created };
  }
}
