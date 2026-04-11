import { Transform, Type } from "class-transformer";
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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
  inventory_movement_types,
  type InventoryMovementType
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

class InventoryMovementsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(inventory_movement_types, { each: true })
  movementType?: InventoryMovementType[];
}

class QuarantineMovementDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  warehouseId!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  reason?: string;
}

@ApiTags(api_openapi_tags.supply.name)
@UseGuards(AuthAccessGuard)
@require_roles(...bootstrap_role_codes)
@Controller("inventory-movements")
export class InventoryMovementsController {
  constructor(private readonly supplyService: SupplyService) {}

  @Get()
  async list(@Query() query: InventoryMovementsReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "movementType"],
      statusField: "movementType",
      statusValues: query.movementType
    });

    const result = await this.supplyService.listInventoryMovements(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const movement = await this.supplyService.getInventoryMovement(id);
    return { data: movement };
  }

  @Post("transfer-to-quarantine")
  @require_roles("warehouse")
  async transferToQuarantine(
    @Body() payload: QuarantineMovementDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const movement = await this.supplyService.transferToQuarantine(payload, access.user);
    return { data: movement };
  }

  @Post("release-from-quarantine")
  @require_roles("warehouse")
  async releaseFromQuarantine(
    @Body() payload: QuarantineMovementDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const movement = await this.supplyService.releaseFromQuarantine(payload, access.user);
    return { data: movement };
  }
}
