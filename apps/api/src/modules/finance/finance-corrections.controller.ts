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
import { IsDateString, IsObject, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { request_context_headers } from "../../common/request-context/request-context.contract";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import {
  build_read_collection_query,
  FinanceManualCorrectionsReadQueryDto
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import { FinanceService } from "./finance.service";

class CreateManualCorrectionDto {
  @IsString()
  @MaxLength(32)
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  recognizedAt!: string;

  @IsString()
  @MaxLength(5000)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUUID()
  relatedOrderId?: string;

  @IsOptional()
  @IsObject()
  reconciliationReference?: Record<string, unknown>;
}

class RejectManualCorrectionDto {
  @IsString()
  @MaxLength(5000)
  reason!: string;
}

interface FinanceCommandRequest extends AuthenticatedRequestLike {
  shellContext?: {
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
}

@ApiTags(api_openapi_tags.paymentsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("finance", "ceo")
@Controller("finance-corrections")
export class FinanceCorrectionsController {
  private static readonly query_dto = FinanceManualCorrectionsReadQueryDto;

  constructor(private readonly financeService: FinanceService) {
    void FinanceCorrectionsController.query_dto;
  }

  @Get()
  async list(
    @Query() query: FinanceManualCorrectionsReadQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "status", "appliedAt"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.financeService.listManualCorrections(readQuery, access.user);
    return to_read_collection_response(result);
  }

  @Get(":correctionId")
  async detail(
    @Param("correctionId") correctionId: string,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const correction = await this.financeService.getManualCorrection(correctionId, access.user);
    return { data: correction };
  }

  @Post()
  @require_roles("finance")
  async create(@Body() payload: CreateManualCorrectionDto, @Req() request: FinanceCommandRequest) {
    const access = get_authenticated_access(request);
    const context = require_finance_command_context(request);
    const created = await this.financeService.createManualCorrection(payload, access.user, context);
    return { data: created };
  }

  @Post(":correctionId/submit-for-approval")
  @require_roles("finance")
  async submitForApproval(
    @Param("correctionId") correctionId: string,
    @Req() request: FinanceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const context = require_finance_command_context(request);
    const submitted = await this.financeService.submitManualCorrectionForApproval(
      correctionId,
      access.user,
      context
    );
    return { data: submitted };
  }

  @Post(":correctionId/approve")
  @require_roles("ceo")
  async approve(
    @Param("correctionId") correctionId: string,
    @Req() request: FinanceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const context = require_finance_command_context(request);
    const approved = await this.financeService.approveManualCorrection(
      correctionId,
      access.user,
      context
    );
    return { data: approved };
  }

  @Post(":correctionId/reject")
  @require_roles("ceo")
  async reject(
    @Param("correctionId") correctionId: string,
    @Body() payload: RejectManualCorrectionDto,
    @Req() request: FinanceCommandRequest
  ) {
    const access = get_authenticated_access(request);
    const context = require_finance_command_context(request);
    const rejected = await this.financeService.rejectManualCorrection(
      correctionId,
      payload,
      access.user,
      context
    );
    return { data: rejected };
  }

  @Post(":correctionId/apply")
  @require_roles("finance")
  async apply(@Param("correctionId") correctionId: string, @Req() request: FinanceCommandRequest) {
    const access = get_authenticated_access(request);
    const context = require_finance_command_context(request);
    const applied = await this.financeService.applyManualCorrection(
      correctionId,
      access.user,
      context
    );
    return { data: applied };
  }
}

function require_finance_command_context(request: FinanceCommandRequest) {
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
