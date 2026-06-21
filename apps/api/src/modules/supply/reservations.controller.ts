import { Transform } from "class-transformer";
import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional } from "class-validator";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import { bootstrap_role_codes } from "../auth/auth.contract";
import {
  BaseReadCollectionQueryDto,
  build_read_collection_query
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import {
  reservation_statuses,
  type ReservationStatus
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

class ReservationsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(reservation_statuses, { each: true })
  status?: ReservationStatus[];
}

@ApiTags(api_openapi_tags.supply.name)
@UseGuards(AuthAccessGuard)
@require_roles(...bootstrap_role_codes)
@Controller("reservations")
export class ReservationsController {
  constructor(@Inject(SupplyService) private readonly supplyService: SupplyService) {}

  @Get()
  async list(@Query() query: ReservationsReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "expiresAt", "status"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.supplyService.listReservations(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const reservation = await this.supplyService.getReservation(id);
    return { data: reservation };
  }
}
