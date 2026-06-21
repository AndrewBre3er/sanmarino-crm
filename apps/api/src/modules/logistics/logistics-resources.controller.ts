import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min
} from "class-validator";
import { request_context_headers } from "../../common/request-context/request-context.contract";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import {
  BaseReadCollectionQueryDto,
  build_read_collection_query
} from "../read-side/shared/read-query.dto";
import type { FilterClause } from "../read-side/shared/read-model.contract";
import { to_read_collection_response } from "../read-side/shared/read-response";
import {
  logistics_route_day_statuses,
  logistics_slot_statuses,
  type LogisticsRouteDayStatus,
  type LogisticsSlotStatus
} from "../transactional/shared/status.contract";
import {
  LogisticsResourcesService,
  type LogisticsResourceCommandContext
} from "./logistics-resources.service";

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

function normalize_boolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

class DeliverySlotsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(logistics_slot_statuses, { each: true })
  status?: LogisticsSlotStatus[];
}

class PickupWindowsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(logistics_slot_statuses, { each: true })
  status?: LogisticsSlotStatus[];
}

class RouteDaysReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(logistics_route_day_statuses, { each: true })
  status?: LogisticsRouteDayStatus[];

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

class DriversReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalize_boolean(value))
  @IsBoolean()
  isActive?: boolean;
}

class VehiclesReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalize_boolean(value))
  @IsBoolean()
  isActive?: boolean;
}

class CreateDeliverySlotDto {
  @IsDateString()
  slotDate!: string;

  @IsDateString()
  windowStart!: string;

  @IsDateString()
  windowEnd!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsIn(logistics_slot_statuses)
  status?: LogisticsSlotStatus;
}

class PatchDeliverySlotDto {
  @IsOptional()
  @IsDateString()
  slotDate?: string;

  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsIn(logistics_slot_statuses)
  status?: LogisticsSlotStatus;
}

class CreatePickupWindowDto {
  @IsDateString()
  windowDate!: string;

  @IsDateString()
  windowStart!: string;

  @IsDateString()
  windowEnd!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsIn(logistics_slot_statuses)
  status?: LogisticsSlotStatus;
}

class PatchPickupWindowDto {
  @IsOptional()
  @IsDateString()
  windowDate?: string;

  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsIn(logistics_slot_statuses)
  status?: LogisticsSlotStatus;
}

class CreateDriverDto {
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class PatchDriverDto {
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  plateNumber?: string | null;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  capacityNotes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class PatchVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  plateNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  capacityNotes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateRouteDayDto {
  @IsDateString()
  routeDate!: string;

  @IsOptional()
  @IsUUID()
  driverId?: string | null;

  @IsOptional()
  @IsUUID()
  vehicleId?: string | null;

  @IsOptional()
  @IsIn(logistics_route_day_statuses)
  status?: LogisticsRouteDayStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

class PatchRouteDayDto {
  @IsOptional()
  @IsDateString()
  routeDate?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string | null;

  @IsOptional()
  @IsUUID()
  vehicleId?: string | null;

  @IsOptional()
  @IsIn(logistics_route_day_statuses)
  status?: LogisticsRouteDayStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

interface LogisticsResourceCommandRequest extends AuthenticatedRequestLike {
  shellContext?: {
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
}

@ApiTags(api_openapi_tags.logisticsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("logistics", "admin", "ceo")
@Controller()
export class LogisticsResourcesController {
  constructor(
    @Inject(LogisticsResourcesService)
    private readonly logisticsResourcesService: LogisticsResourcesService
  ) {}

  @Get("delivery-slots")
  async listDeliverySlots(
    @Query() query: DeliverySlotsReadQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "slotDate",
      allowedSortFields: [
        "slotDate",
        "windowStart",
        "windowEnd",
        "capacity",
        "reservedCount",
        "status",
        "createdAt",
        "updatedAt"
      ],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.logisticsResourcesService.listDeliverySlots(readQuery);
    return to_read_collection_response(result);
  }

  @Get("delivery-slots/:slotId")
  async detailDeliverySlot(@Param("slotId") slotId: string, @Req() request: AuthenticatedRequestLike) {
    get_authenticated_access(request);
    const slot = await this.logisticsResourcesService.getDeliverySlot(slotId);
    return { data: slot };
  }

  @Post("delivery-slots")
  async createDeliverySlot(
    @Body() payload: CreateDeliverySlotDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const slot = await this.logisticsResourcesService.createDeliverySlot(
      payload,
      access.user,
      commandContext
    );

    return { data: slot };
  }

  @Patch("delivery-slots/:slotId")
  async patchDeliverySlot(
    @Param("slotId") slotId: string,
    @Body() payload: PatchDeliverySlotDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const slot = await this.logisticsResourcesService.patchDeliverySlot(
      slotId,
      payload,
      access.user,
      commandContext
    );

    return { data: slot };
  }

  @Get("pickup-windows")
  async listPickupWindows(
    @Query() query: PickupWindowsReadQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "windowDate",
      allowedSortFields: [
        "windowDate",
        "windowStart",
        "windowEnd",
        "capacity",
        "reservedCount",
        "status",
        "createdAt",
        "updatedAt"
      ],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.logisticsResourcesService.listPickupWindows(readQuery);
    return to_read_collection_response(result);
  }

  @Get("pickup-windows/:pickupWindowId")
  async detailPickupWindow(
    @Param("pickupWindowId") pickupWindowId: string,
    @Req() request: AuthenticatedRequestLike
  ) {
    get_authenticated_access(request);
    const pickupWindow = await this.logisticsResourcesService.getPickupWindow(pickupWindowId);
    return { data: pickupWindow };
  }

  @Post("pickup-windows")
  async createPickupWindow(
    @Body() payload: CreatePickupWindowDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const pickupWindow = await this.logisticsResourcesService.createPickupWindow(
      payload,
      access.user,
      commandContext
    );

    return { data: pickupWindow };
  }

  @Patch("pickup-windows/:pickupWindowId")
  async patchPickupWindow(
    @Param("pickupWindowId") pickupWindowId: string,
    @Body() payload: PatchPickupWindowDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const pickupWindow = await this.logisticsResourcesService.patchPickupWindow(
      pickupWindowId,
      payload,
      access.user,
      commandContext
    );

    return { data: pickupWindow };
  }

  @Get("route-days")
  async listRouteDays(@Query() query: RouteDaysReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "routeDate",
      allowedSortFields: [
        "routeDate",
        "status",
        "createdAt",
        "updatedAt"
      ],
      statusField: "status",
      statusValues: query.status
    });

    const additionalFilters: FilterClause[] = [];
    if (query.driverId) {
      additionalFilters.push({
        field: "driverId",
        operator: "eq",
        value: query.driverId
      });
    }

    if (query.vehicleId) {
      additionalFilters.push({
        field: "vehicleId",
        operator: "eq",
        value: query.vehicleId
      });
    }

    if (additionalFilters.length > 0) {
      readQuery.contract.filters = [...(readQuery.contract.filters ?? []), ...additionalFilters];
    }

    const result = await this.logisticsResourcesService.listRouteDays(readQuery);
    return to_read_collection_response(result);
  }

  @Get("route-days/:routeDayId")
  async detailRouteDay(@Param("routeDayId") routeDayId: string, @Req() request: AuthenticatedRequestLike) {
    get_authenticated_access(request);
    const routeDay = await this.logisticsResourcesService.getRouteDay(routeDayId);
    return { data: routeDay };
  }

  @Post("route-days")
  async createRouteDay(
    @Body() payload: CreateRouteDayDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const routeDay = await this.logisticsResourcesService.createRouteDay(
      payload,
      access.user,
      commandContext
    );

    return { data: routeDay };
  }

  @Patch("route-days/:routeDayId")
  async patchRouteDay(
    @Param("routeDayId") routeDayId: string,
    @Body() payload: PatchRouteDayDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const routeDay = await this.logisticsResourcesService.patchRouteDay(
      routeDayId,
      payload,
      access.user,
      commandContext
    );

    return { data: routeDay };
  }

  @Get("drivers")
  async listDrivers(@Query() query: DriversReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "name",
      allowedSortFields: ["name", "isActive", "createdAt", "updatedAt"]
    });

    const additionalFilters: FilterClause[] = [];
    if (query.isActive !== undefined) {
      additionalFilters.push({
        field: "isActive",
        operator: "eq",
        value: query.isActive
      });
    }

    if (additionalFilters.length > 0) {
      readQuery.contract.filters = [...(readQuery.contract.filters ?? []), ...additionalFilters];
    }

    const result = await this.logisticsResourcesService.listDrivers(readQuery);
    return to_read_collection_response(result);
  }

  @Get("drivers/:driverId")
  async detailDriver(@Param("driverId") driverId: string, @Req() request: AuthenticatedRequestLike) {
    get_authenticated_access(request);
    const driver = await this.logisticsResourcesService.getDriver(driverId);
    return { data: driver };
  }

  @Post("drivers")
  async createDriver(
    @Body() payload: CreateDriverDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const driver = await this.logisticsResourcesService.createDriver(
      payload,
      access.user,
      commandContext
    );

    return { data: driver };
  }

  @Patch("drivers/:driverId")
  async patchDriver(
    @Param("driverId") driverId: string,
    @Body() payload: PatchDriverDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const driver = await this.logisticsResourcesService.patchDriver(
      driverId,
      payload,
      access.user,
      commandContext
    );

    return { data: driver };
  }

  @Get("vehicles")
  async listVehicles(@Query() query: VehiclesReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "name",
      allowedSortFields: ["name", "plateNumber", "isActive", "createdAt", "updatedAt"]
    });

    const additionalFilters: FilterClause[] = [];
    if (query.isActive !== undefined) {
      additionalFilters.push({
        field: "isActive",
        operator: "eq",
        value: query.isActive
      });
    }

    if (additionalFilters.length > 0) {
      readQuery.contract.filters = [...(readQuery.contract.filters ?? []), ...additionalFilters];
    }

    const result = await this.logisticsResourcesService.listVehicles(readQuery);
    return to_read_collection_response(result);
  }

  @Get("vehicles/:vehicleId")
  async detailVehicle(@Param("vehicleId") vehicleId: string, @Req() request: AuthenticatedRequestLike) {
    get_authenticated_access(request);
    const vehicle = await this.logisticsResourcesService.getVehicle(vehicleId);
    return { data: vehicle };
  }

  @Post("vehicles")
  async createVehicle(
    @Body() payload: CreateVehicleDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const vehicle = await this.logisticsResourcesService.createVehicle(
      payload,
      access.user,
      commandContext
    );

    return { data: vehicle };
  }

  @Patch("vehicles/:vehicleId")
  async patchVehicle(
    @Param("vehicleId") vehicleId: string,
    @Body() payload: PatchVehicleDto,
    @Req() request: LogisticsResourceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const vehicle = await this.logisticsResourcesService.patchVehicle(
      vehicleId,
      payload,
      access.user,
      commandContext
    );

    return { data: vehicle };
  }
}

function get_command_context(request: LogisticsResourceCommandRequest): LogisticsResourceCommandContext {
  const shellContext = request.shellContext;
  const idempotencyKey = shellContext?.idempotencyKey;
  if (!idempotencyKey) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${request_context_headers.idempotencyKey} header is required`
    });
  }

  return {
    idempotencyKey,
    ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
    ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
  };
}
