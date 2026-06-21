import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
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
import { product_units, type ProductUnit } from "../transactional/shared/status.contract";
import { SupplyService } from "./supply.service";

class PurchaseReceiptsReadQueryDto extends BaseReadCollectionQueryDto {}

class CreatePurchaseReceiptItemDto {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.001)
  quantity!: number;

  @IsIn(product_units)
  unit!: ProductUnit;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  unitCost!: string;

  @IsOptional()
  @IsUUID()
  supplierRequestItemId?: string;
}

class CreatePurchaseReceiptDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  supplierId!: string;

  @IsUUID()
  supplierRequestId!: string;

  @IsDateString()
  receivedAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReceiptItemDto)
  items!: CreatePurchaseReceiptItemDto[];
}

@ApiTags(api_openapi_tags.supply.name)
@UseGuards(AuthAccessGuard)
@require_roles(...bootstrap_role_codes)
@Controller("purchase-receipts")
export class PurchaseReceiptsController {
  constructor(@Inject(SupplyService) private readonly supplyService: SupplyService) {}

  @Get()
  async list(@Query() query: PurchaseReceiptsReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "receivedAt",
      allowedSortFields: ["receivedAt", "createdAt", "updatedAt", "receiptNumber"]
    });

    const result = await this.supplyService.listPurchaseReceipts(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const purchaseReceipt = await this.supplyService.getPurchaseReceipt(id);
    return { data: purchaseReceipt };
  }

  @Post()
  @require_roles("warehouse")
  async create(
    @Body() payload: CreatePurchaseReceiptDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const created = await this.supplyService.createPurchaseReceipt(payload, access.user);
    return { data: created };
  }
}
