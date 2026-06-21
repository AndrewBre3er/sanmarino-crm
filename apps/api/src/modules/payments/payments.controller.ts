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
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { request_context_headers } from "../../common/request-context/request-context.contract";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import { payment_methods, type PaymentMethod } from "../transactional/shared/status.contract";
import { PaymentsService } from "./payments.service";

class CreatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  @MaxLength(32)
  amount!: string;

  @IsIn(payment_methods)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalRef?: string;
}

class RefundPaymentDto {
  @IsString()
  @MaxLength(32)
  amount!: string;

  @IsUUID()
  returnRequestId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

interface PaymentCommandRequest extends AuthenticatedRequestLike {
  shellContext?: {
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
}

@ApiTags(api_openapi_tags.paymentsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("warehouse", "finance", "admin", "ceo")
@Controller("payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Post()
  @require_roles("warehouse", "finance", "admin", "ceo")
  async create(@Body() payload: CreatePaymentDto, @Req() request: PaymentCommandRequest) {
    const access = get_authenticated_access(request);
    const shellContext = request.shellContext;
    const idempotencyKey = shellContext?.idempotencyKey;

    if (!idempotencyKey) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `${request_context_headers.idempotencyKey} header is required`
      });
    }

    const created = await this.paymentsService.createPayment(
      {
        orderId: payload.orderId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        ...(payload.externalRef !== undefined ? { externalReference: payload.externalRef } : {})
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

  @Post(":paymentId/complete")
  @require_roles("finance", "admin", "ceo")
  async complete(@Param("paymentId") paymentId: string, @Req() request: PaymentCommandRequest) {
    const access = get_authenticated_access(request);
    const shellContext = request.shellContext;
    const idempotencyKey = shellContext?.idempotencyKey;

    if (!idempotencyKey) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `${request_context_headers.idempotencyKey} header is required`
      });
    }

    const completed = await this.paymentsService.completePayment(paymentId, access.user, {
      idempotencyKey,
      ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
      ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
    });

    return { data: completed };
  }

  @Post(":paymentId/refunds")
  @require_roles("finance", "admin", "ceo")
  async refund(
    @Param("paymentId") paymentId: string,
    @Body() payload: RefundPaymentDto,
    @Req() request: PaymentCommandRequest
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

    const refunded = await this.paymentsService.refundPayment(
      paymentId,
      {
        amount: payload.amount,
        returnRequestId: payload.returnRequestId,
        ...(payload.reason !== undefined ? { reason: payload.reason } : {})
      },
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );

    return { data: refunded };
  }
}
