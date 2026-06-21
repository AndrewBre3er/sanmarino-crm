import { Type } from "class-transformer";
import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min
} from "class-validator";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import type { AuthenticatedRequestLike } from "../auth/auth.access.helpers";
import { get_authenticated_access } from "../auth/auth.access.helpers";
import { bootstrap_role_codes } from "../auth/auth.contract";
import { SupplyService } from "./supply.service";

const base_purchase_price_pattern = /^\d+(\.\d{1,2})?$/;

class CreateProductSupplierDto {
  @IsUUID()
  supplierId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierPriority!: number;

  @IsString()
  @MaxLength(32)
  @Matches(base_purchase_price_pattern)
  basePurchasePrice!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class PatchProductSupplierDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierPriority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(base_purchase_price_pattern)
  basePurchasePrice?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags(api_openapi_tags.supply.name)
@UseGuards(AuthAccessGuard)
@require_roles(...bootstrap_role_codes)
@Controller("products/:productId/suppliers")
export class ProductSuppliersController {
  constructor(@Inject(SupplyService) private readonly supplyService: SupplyService) {}

  @Get()
  async list(@Param("productId") productId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const productSuppliers = await this.supplyService.listProductSuppliers(
      productId,
      access.user
    );
    return { data: productSuppliers };
  }

  @Post()
  @require_roles("finance", "admin", "ceo")
  async create(
    @Param("productId") productId: string,
    @Body() payload: CreateProductSupplierDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const created = await this.supplyService.createProductSupplier(
      productId,
      payload,
      access.user
    );
    return { data: created };
  }

  @Patch(":productSupplierId")
  @require_roles("finance", "admin", "ceo")
  async patch(
    @Param("productId") productId: string,
    @Param("productSupplierId") productSupplierId: string,
    @Body() payload: PatchProductSupplierDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const updated = await this.supplyService.patchProductSupplier(
      productId,
      productSupplierId,
      payload,
      access.user
    );
    return { data: updated };
  }
}
