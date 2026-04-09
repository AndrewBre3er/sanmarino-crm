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
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import { get_authenticated_access, type AuthenticatedRequestLike } from "../auth/auth.access.helpers";
import {
  BaseReadCollectionQueryDto,
  build_read_collection_query
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import { CrmRelationsService } from "./crm-relations.service";

class ClientsReadQueryDto extends BaseReadCollectionQueryDto {}

class CreateClientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  clientType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

@ApiTags(api_openapi_tags.crmRelations.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "admin", "ceo")
@Controller("clients")
export class ClientsController {
  constructor(private readonly crmRelationsService: CrmRelationsService) {}

  @Get()
  async list(
    @Query() query: ClientsReadQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    void get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "name", "clientType"]
    });

    const result = await this.crmRelationsService.listClients(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() request: AuthenticatedRequestLike) {
    void get_authenticated_access(request);
    const client = await this.crmRelationsService.getClient(id);
    return { data: client };
  }

  @Post()
  async create(@Body() payload: CreateClientDto, @Req() request: AuthenticatedRequestLike) {
    void get_authenticated_access(request);
    const created = await this.crmRelationsService.createClient(payload);
    return { data: created };
  }
}
