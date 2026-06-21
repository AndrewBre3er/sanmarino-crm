import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsISO8601, IsObject, IsString, MaxLength } from "class-validator";
import { request_context_headers } from "../../common/request-context/request-context.contract";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import { IntegrationsNotificationsService } from "./integrations-notifications.service";

class ReceiveInboundIntegrationEventDto {
  @IsString()
  @MaxLength(128)
  externalEventId!: string;

  @IsISO8601()
  occurredAt!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

class EnqueueNotificationDispatchDto {
  @IsString()
  @MaxLength(128)
  eventType!: string;

  @IsString()
  @MaxLength(255)
  targetRef!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

interface IntegrationsNotificationsCommandRequest extends AuthenticatedRequestLike {
  shellContext?: {
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
}

@ApiTags(api_openapi_tags.integrationsNotifications.name)
@UseGuards(AuthAccessGuard)
@require_roles("admin", "ceo")
@Controller()
export class IntegrationsNotificationsController {
  constructor(
    @Inject(IntegrationsNotificationsService)
    private readonly integrationsNotificationsService: IntegrationsNotificationsService
  ) {}

  @Post("integrations/ats/events")
  async receiveAtsEvent(
    @Body() payload: ReceiveInboundIntegrationEventDto,
    @Req() request: IntegrationsNotificationsCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const context = read_command_context_or_throw(request);
    const received = await this.integrationsNotificationsService.receiveInboundIntegrationEvent(
      "ats",
      payload,
      access.user,
      context
    );

    return { data: received };
  }

  @Post("integrations/avito/events")
  async receiveAvitoEvent(
    @Body() payload: ReceiveInboundIntegrationEventDto,
    @Req() request: IntegrationsNotificationsCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const context = read_command_context_or_throw(request);
    const received = await this.integrationsNotificationsService.receiveInboundIntegrationEvent(
      "avito",
      payload,
      access.user,
      context
    );

    return { data: received };
  }

  @Post("notifications/telegram")
  async enqueueTelegramNotification(
    @Body() payload: EnqueueNotificationDispatchDto,
    @Req() request: IntegrationsNotificationsCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const context = read_command_context_or_throw(request);
    const dispatch = await this.integrationsNotificationsService.enqueueNotificationDispatch(
      "telegram",
      payload,
      access.user,
      context
    );

    return { data: dispatch };
  }

  @Post("notifications/max")
  async enqueueMaxNotification(
    @Body() payload: EnqueueNotificationDispatchDto,
    @Req() request: IntegrationsNotificationsCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const context = read_command_context_or_throw(request);
    const dispatch = await this.integrationsNotificationsService.enqueueNotificationDispatch(
      "max",
      payload,
      access.user,
      context
    );

    return { data: dispatch };
  }
}

function read_command_context_or_throw(request: IntegrationsNotificationsCommandRequest) {
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
