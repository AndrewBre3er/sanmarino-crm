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
  IsBoolean,
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
import { CrmRelationsService } from "./crm-relations.service";

class ContactsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;
}

class CreateContactDto {
  @IsUUID()
  clientId!: string;

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
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

@ApiTags(api_openapi_tags.crmRelations.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "admin", "ceo")
@Controller("contacts")
export class ContactsController {
  constructor(private readonly crmRelationsService: CrmRelationsService) {}

  @Get()
  async list(
    @Query() query: ContactsReadQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    void get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "name", "isPrimary"]
    });

    const result = await this.crmRelationsService.listContacts(readQuery, {
      ...(query.clientId ? { clientId: query.clientId } : {})
    });
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() request: AuthenticatedRequestLike) {
    void get_authenticated_access(request);
    const contact = await this.crmRelationsService.getContact(id);
    return { data: contact };
  }

  @Post()
  async create(@Body() payload: CreateContactDto, @Req() request: AuthenticatedRequestLike) {
    void get_authenticated_access(request);
    const created = await this.crmRelationsService.createContact(payload);
    return { data: created };
  }
}
