import { Transform, Type } from "class-transformer";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from "class-validator";
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
  stock_lock_statuses,
  type StockLockStatus
} from "../transactional/shared/status.contract";
import { SupplyService } from "./supply.service";

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

class StockLocksReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(stock_lock_statuses, { each: true })
  status?: StockLockStatus[];
}

class CreateStockLockDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  dealId!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(10)
  ttlMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

@ApiTags(api_openapi_tags.supply.name)
@UseGuards(AuthAccessGuard)
@require_roles(...bootstrap_role_codes)
@Controller("stock-locks")
export class StockLocksController {
  constructor(@Inject(SupplyService) private readonly supplyService: SupplyService) {}

  @Get()
  async list(@Query() query: StockLocksReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "expiresAt", "status"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.supplyService.listStockLocks(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const stockLock = await this.supplyService.getStockLock(id);
    return { data: stockLock };
  }

  @Post()
  @require_roles("seller")
  async create(@Body() payload: CreateStockLockDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const created = await this.supplyService.createStockLock(payload, access.user);
    return { data: created };
  }

  @Post(":id/release")
  @require_roles("seller")
  async release(@Param("id") id: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const released = await this.supplyService.releaseStockLock(id, access.user);
    return { data: released };
  }
}
