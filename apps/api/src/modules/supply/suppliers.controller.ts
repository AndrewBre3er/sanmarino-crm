import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import type { AuthenticatedRequestLike } from "../auth/auth.access.helpers";
import { get_authenticated_access } from "../auth/auth.access.helpers";
import { bootstrap_role_codes } from "../auth/auth.contract";
import {
  BaseReadCollectionQueryDto,
  build_read_collection_query
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import { SupplyService } from "./supply.service";

class SuppliersReadQueryDto extends BaseReadCollectionQueryDto {}

class CreateSupplierDto {
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
  @MaxLength(5000)
  notes?: string;
}

@ApiTags(api_openapi_tags.supply.name)
@UseGuards(AuthAccessGuard)
@require_roles(...bootstrap_role_codes)
@Controller("suppliers")
export class SuppliersController {
  constructor(@Inject(SupplyService) private readonly supplyService: SupplyService) {}

  @Get()
  async list(@Query() query: SuppliersReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "name"]
    });

    const result = await this.supplyService.listSuppliers(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const supplier = await this.supplyService.getSupplier(id);
    return { data: supplier };
  }

  @Post()
  @require_roles("seller", "admin", "ceo")
  async create(@Body() payload: CreateSupplierDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const created = await this.supplyService.createSupplier(payload, access.user);
    return { data: created };
  }
}
