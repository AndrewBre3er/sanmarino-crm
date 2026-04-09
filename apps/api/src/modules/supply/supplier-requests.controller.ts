import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
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
import {
  product_units,
  supplier_request_statuses,
  type ProductUnit,
  type SupplierRequestStatus
} from "../transactional/shared/status.contract";
import { SupplyService } from "./supply.service";

const supplier_request_business_source_types = ["deal", "order"] as const;

function to_string_array(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const flattened = value
      .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return flattened.length > 0 ? flattened : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed.length > 0 ? parsed : undefined;
}

class SupplierRequestsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(supplier_request_statuses, { each: true })
  status?: SupplierRequestStatus[];
}

class CreateSupplierRequestItemDto {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  quantity!: number;

  @IsIn(product_units)
  unit!: ProductUnit;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  sourceLineRef!: string;

  @IsOptional()
  @IsObject()
  sourceLineContext?: Record<string, unknown>;
}

class CreateSupplierRequestDto {
  @IsUUID()
  supplierId!: string;

  @IsIn(supplier_request_business_source_types)
  businessSourceType!: "deal" | "order";

  @IsUUID()
  businessSourceId!: string;

  @IsDateString()
  expectedSupplyDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierRequestItemDto)
  items!: CreateSupplierRequestItemDto[];
}

@ApiTags(api_openapi_tags.supply.name)
@UseGuards(AuthAccessGuard)
@require_roles(...bootstrap_role_codes)
@Controller("supplier-requests")
export class SupplierRequestsController {
  constructor(private readonly supplyService: SupplyService) {}

  @Get()
  async list(@Query() query: SupplierRequestsReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "expectedSupplyDate", "status"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.supplyService.listSupplierRequests(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const supplierRequest = await this.supplyService.getSupplierRequest(id);
    return { data: supplierRequest };
  }

  @Post()
  @require_roles("seller")
  async create(
    @Body() payload: CreateSupplierRequestDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const created = await this.supplyService.createSupplierRequest(payload, access.user);
    return { data: created };
  }
}
