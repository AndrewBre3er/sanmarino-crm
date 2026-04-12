import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested
} from "class-validator";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { request_context_headers } from "../../common/request-context/request-context.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import {
  build_read_collection_query,
  FulfillmentsReadQueryDto
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import {
  order_fulfillment_types,
  type OrderFulfillmentType
} from "../transactional/shared/status.contract";
import { FulfillmentsService } from "./fulfillments.service";

class CreateFulfillmentItemDto {
  @IsUUID()
  orderItemId!: string;

  @IsString()
  @MaxLength(32)
  qty!: string;
}

class CreateFulfillmentDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsIn(order_fulfillment_types)
  fulfillmentType?: OrderFulfillmentType;

  @IsOptional()
  @IsUUID()
  deliveryTaskId?: string;

  @IsOptional()
  @IsUUID()
  pickupWindowId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFulfillmentItemDto)
  items?: CreateFulfillmentItemDto[];
}

@ApiTags(api_openapi_tags.fulfillments.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "warehouse", "logistics", "finance", "admin", "ceo")
@Controller("fulfillments")
export class FulfillmentsController {
  constructor(private readonly fulfillmentsService: FulfillmentsService) {}

  @Get()
  async list(@Query() query: FulfillmentsReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: [
        "createdAt",
        "updatedAt",
        "status",
        "fulfilledAt",
        "orderId",
        "fulfillmentType"
      ],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.fulfillmentsService.listFulfillments(
      readQuery,
      access.user,
      query.orderId ? { orderId: query.orderId } : {}
    );

    return to_read_collection_response(result);
  }

  @Get(":fulfillmentId")
  async detail(
    @Param("fulfillmentId") fulfillmentId: string,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const fulfillment = await this.fulfillmentsService.getFulfillment(fulfillmentId, access.user);
    return { data: fulfillment };
  }

  @Post()
  @require_roles("warehouse", "logistics", "admin", "ceo")
  async create(@Body() payload: CreateFulfillmentDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const fulfillment = await this.fulfillmentsService.createFulfillment(
      {
        orderId: payload.orderId,
        ...(payload.fulfillmentType ? { fulfillmentType: payload.fulfillmentType } : {}),
        ...(payload.deliveryTaskId ? { deliveryTaskId: payload.deliveryTaskId } : {}),
        ...(payload.pickupWindowId ? { pickupWindowId: payload.pickupWindowId } : {}),
        ...(payload.items ? { items: payload.items } : {})
      },
      access.user
    );
    return { data: fulfillment };
  }

  @Post(":fulfillmentId/confirm-execution")
  @require_roles("warehouse", "logistics", "admin", "ceo")
  async confirmExecution(
    @Param("fulfillmentId") fulfillmentId: string,
    @Req()
    request: AuthenticatedRequestLike & {
      shellContext?: {
        idempotencyKey?: string;
        requestId?: string;
        correlationId?: string;
      };
    }
  ) {
    const access = get_authenticated_access(request);
    const shellContext = request.shellContext;
    const idempotencyKey = shellContext?.idempotencyKey;

    if (!idempotencyKey) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `${request_context_headers.idempotencyKey} header is required`
      });
    }

    const fulfillment = await this.fulfillmentsService.confirmExecution(
      fulfillmentId,
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );
    return { data: fulfillment };
  }
}
