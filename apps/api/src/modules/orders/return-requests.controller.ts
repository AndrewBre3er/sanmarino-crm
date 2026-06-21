import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { request_context_headers } from "../../common/request-context/request-context.contract";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import { ReturnRequestsService } from "./return-requests.service";
import type { ReturnRequestItemResolution } from "./return-requests.service";

class CreateReturnRequestItemDto {
  @IsUUID()
  orderItemId!: string;

  @IsString()
  @MaxLength(32)
  quantity!: string;

  @IsOptional()
  @IsIn(["return_to_quarantine", "writeoff", "refund_only"])
  resolution?: ReturnRequestItemResolution;
}

class CreateReturnRequestDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  @MaxLength(2000)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  requestedRefundAmount?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReturnRequestItemDto)
  items!: CreateReturnRequestItemDto[];
}

interface ReturnRequestCommandRequest extends AuthenticatedRequestLike {
  shellContext?: {
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
}

@ApiTags(api_openapi_tags.returnsRead.name)
@UseGuards(AuthAccessGuard)
@Controller("return-requests")
export class ReturnRequestsController {
  constructor(
    @Inject(ReturnRequestsService)
    private readonly returnRequestsService: ReturnRequestsService
  ) {}

  @require_roles("seller")
  @Post()
  async create(
    @Body() payload: CreateReturnRequestDto,
    @Req() request: ReturnRequestCommandRequest
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

    const created = await this.returnRequestsService.createReturnRequest(
      {
        orderId: payload.orderId,
        reason: payload.reason,
        ...(payload.requestedRefundAmount !== undefined
          ? { requestedRefundAmount: payload.requestedRefundAmount }
          : {}),
        items: payload.items
      },
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );

    return { data: created };
  }

  @require_roles("finance", "ceo", "admin")
  @Post(":returnRequestId/confirm")
  async confirm(
    @Param("returnRequestId") returnRequestId: string,
    @Req() request: ReturnRequestCommandRequest
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

    const confirmed = await this.returnRequestsService.confirmReturnRequest(
      returnRequestId,
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );

    return { data: confirmed };
  }

  @require_roles("warehouse", "finance", "ceo", "admin")
  @Post(":returnRequestId/process")
  async process(
    @Param("returnRequestId") returnRequestId: string,
    @Req() request: ReturnRequestCommandRequest
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

    const processed = await this.returnRequestsService.processReturnRequest(
      returnRequestId,
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );

    return { data: processed };
  }

  @require_roles("finance", "ceo", "admin")
  @Post(":returnRequestId/close")
  async close(
    @Param("returnRequestId") returnRequestId: string,
    @Req() request: ReturnRequestCommandRequest
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

    const closed = await this.returnRequestsService.closeReturnRequest(
      returnRequestId,
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );

    return { data: closed };
  }
}
