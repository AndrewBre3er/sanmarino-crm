import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";
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
  MarketingExpensesReadQueryDto
} from "../read-side/shared/read-query.dto";
import type { FilterClause } from "../read-side/shared/read-model.contract";
import { to_read_collection_response } from "../read-side/shared/read-response";
import { FinanceService } from "./finance.service";

class CreateMarketingExpenseDto {
  @IsString()
  @MaxLength(128)
  source!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  campaign?: string;

  @IsString()
  @MaxLength(32)
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

class PatchMarketingExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  amount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
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
@require_roles("finance", "admin", "ceo")
@Controller("marketing-expenses")
export class MarketingExpensesController {
  private static readonly query_dto = MarketingExpensesReadQueryDto;

  constructor(private readonly financeService: FinanceService) {
    void MarketingExpensesController.query_dto;
  }

  @Get()
  async list(@Query() query: MarketingExpensesReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "occurredAt",
      allowedSortFields: ["occurredAt", "createdAt", "updatedAt", "source", "amount"]
    });

    const additionalFilters: FilterClause[] = [];
    if (query.source) {
      additionalFilters.push({
        field: "source",
        operator: "eq",
        value: query.source
      });
    }

    if (additionalFilters.length > 0) {
      readQuery.contract.filters = [...(readQuery.contract.filters ?? []), ...additionalFilters];
    }

    const result = await this.financeService.listMarketingExpenses(readQuery, access.user);
    return to_read_collection_response(result);
  }

  @Get(":marketingExpenseId")
  async detail(
    @Param("marketingExpenseId") marketingExpenseId: string,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const marketingExpense = await this.financeService.getMarketingExpense(
      marketingExpenseId,
      access.user
    );
    if (!marketingExpense) {
      throw new NotFoundException(`Marketing expense '${marketingExpenseId}' was not found`);
    }

    return { data: marketingExpense };
  }

  @Post()
  async create(@Body() payload: CreateMarketingExpenseDto, @Req() request: FinanceCommandRequest) {
    const access = get_authenticated_access(request);
    const shellContext = request.shellContext;
    const idempotencyKey = shellContext?.idempotencyKey;
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `${request_context_headers.idempotencyKey} header is required`
      });
    }

    const created = await this.financeService.createMarketingExpense(payload, access.user, {
      idempotencyKey,
      ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
      ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
    });
    return { data: created };
  }

  @Patch(":marketingExpenseId")
  async patch(
    @Param("marketingExpenseId") marketingExpenseId: string,
    @Body() payload: PatchMarketingExpenseDto,
    @Req() request: FinanceCommandRequest
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

    const updated = await this.financeService.updateMarketingExpense(
      marketingExpenseId,
      payload,
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );
    return { data: updated };
  }
}
