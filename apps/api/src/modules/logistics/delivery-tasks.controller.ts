import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsDateString,
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
import { LogisticsService, type DeliveryTaskCommandContext } from "./logistics.service";

class CreateDeliveryTaskDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsUUID()
  routeDayId?: string;

  @IsOptional()
  @IsUUID()
  deliverySlotId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceNo?: number;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  addressText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  recipientPhone?: string;
}

class AssignDeliveryTaskDto {
  @IsOptional()
  @IsUUID()
  routeDayId?: string;

  @IsOptional()
  @IsUUID()
  deliverySlotId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceNo?: number;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;
}

class DeliverDeliveryTaskDto {
  @IsOptional()
  @IsDateString()
  deliveredAt?: string;
}

class FailDeliveryTaskDto {
  @IsString()
  @MaxLength(2000)
  failureReason!: string;
}

class RescheduleDeliveryTaskDto {
  @IsOptional()
  @IsUUID()
  routeDayId?: string;

  @IsOptional()
  @IsUUID()
  deliverySlotId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceNo?: number;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;
}

interface DeliveryTaskCommandRequest extends AuthenticatedRequestLike {
  shellContext?: {
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
}

@ApiTags(api_openapi_tags.logisticsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("logistics", "admin", "ceo")
@Controller("delivery-tasks")
export class DeliveryTasksController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post()
  async create(@Body() payload: CreateDeliveryTaskDto, @Req() request: DeliveryTaskCommandRequest) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const deliveryTask = await this.logisticsService.createDeliveryTask(
      {
        orderId: payload.orderId,
        ...(payload.routeDayId !== undefined ? { routeDayId: payload.routeDayId } : {}),
        ...(payload.deliverySlotId !== undefined ? { deliverySlotId: payload.deliverySlotId } : {}),
        ...(payload.driverId !== undefined ? { driverId: payload.driverId } : {}),
        ...(payload.vehicleId !== undefined ? { vehicleId: payload.vehicleId } : {}),
        ...(payload.sequenceNo !== undefined ? { sequenceNo: payload.sequenceNo } : {}),
        ...(payload.plannedDate !== undefined ? { plannedDate: payload.plannedDate } : {}),
        ...(payload.addressText !== undefined ? { addressText: payload.addressText } : {}),
        ...(payload.recipientName !== undefined ? { recipientName: payload.recipientName } : {}),
        ...(payload.recipientPhone !== undefined ? { recipientPhone: payload.recipientPhone } : {})
      },
      access.user,
      commandContext
    );

    return { data: deliveryTask };
  }

  @Post(":taskId/assign")
  async assign(
    @Param("taskId") taskId: string,
    @Body() payload: AssignDeliveryTaskDto,
    @Req() request: DeliveryTaskCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const deliveryTask = await this.logisticsService.assignDeliveryTask(
      taskId,
      {
        ...(payload.routeDayId !== undefined ? { routeDayId: payload.routeDayId } : {}),
        ...(payload.deliverySlotId !== undefined ? { deliverySlotId: payload.deliverySlotId } : {}),
        ...(payload.driverId !== undefined ? { driverId: payload.driverId } : {}),
        ...(payload.vehicleId !== undefined ? { vehicleId: payload.vehicleId } : {}),
        ...(payload.sequenceNo !== undefined ? { sequenceNo: payload.sequenceNo } : {}),
        ...(payload.plannedDate !== undefined ? { plannedDate: payload.plannedDate } : {})
      },
      access.user,
      commandContext
    );

    return { data: deliveryTask };
  }

  @Post(":taskId/start-transit")
  async startTransit(@Param("taskId") taskId: string, @Req() request: DeliveryTaskCommandRequest) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const deliveryTask = await this.logisticsService.startTransitDeliveryTask(
      taskId,
      access.user,
      commandContext
    );

    return { data: deliveryTask };
  }

  @Post(":taskId/deliver")
  async deliver(
    @Param("taskId") taskId: string,
    @Body() payload: DeliverDeliveryTaskDto,
    @Req() request: DeliveryTaskCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const deliveryTask = await this.logisticsService.deliverDeliveryTask(
      taskId,
      {
        ...(payload.deliveredAt !== undefined ? { deliveredAt: payload.deliveredAt } : {})
      },
      access.user,
      commandContext
    );

    return { data: deliveryTask };
  }

  @Post(":taskId/fail")
  async fail(
    @Param("taskId") taskId: string,
    @Body() payload: FailDeliveryTaskDto,
    @Req() request: DeliveryTaskCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const deliveryTask = await this.logisticsService.failDeliveryTask(
      taskId,
      { failureReason: payload.failureReason },
      access.user,
      commandContext
    );

    return { data: deliveryTask };
  }

  @Post(":taskId/reschedule")
  async reschedule(
    @Param("taskId") taskId: string,
    @Body() payload: RescheduleDeliveryTaskDto,
    @Req() request: DeliveryTaskCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const commandContext = get_command_context(request);
    const deliveryTask = await this.logisticsService.rescheduleDeliveryTask(
      taskId,
      {
        ...(payload.routeDayId !== undefined ? { routeDayId: payload.routeDayId } : {}),
        ...(payload.deliverySlotId !== undefined ? { deliverySlotId: payload.deliverySlotId } : {}),
        ...(payload.driverId !== undefined ? { driverId: payload.driverId } : {}),
        ...(payload.vehicleId !== undefined ? { vehicleId: payload.vehicleId } : {}),
        ...(payload.sequenceNo !== undefined ? { sequenceNo: payload.sequenceNo } : {}),
        ...(payload.plannedDate !== undefined ? { plannedDate: payload.plannedDate } : {})
      },
      access.user,
      commandContext
    );

    return { data: deliveryTask };
  }
}

function get_command_context(request: DeliveryTaskCommandRequest): DeliveryTaskCommandContext {
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

