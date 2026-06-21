import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
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
  ExpensesReadQueryDto
} from "../read-side/shared/read-query.dto";
import type { FilterClause } from "../read-side/shared/read-model.contract";
import { to_read_collection_response } from "../read-side/shared/read-response";
import { expense_types, type ExpenseType } from "../transactional/shared/status.contract";
import { FinanceService } from "./finance.service";

class CreateExpenseDto {
  @IsIn(expense_types)
  expenseType!: ExpenseType;

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

  @IsOptional()
  @IsUUID()
  relatedOrderId?: string;
}

class PatchExpenseDto {
  @IsOptional()
  @IsIn(expense_types)
  expenseType?: ExpenseType;

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

  @IsOptional()
  @IsUUID()
  relatedOrderId?: string;
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
@Controller("expenses")
export class ExpensesController {
  private static readonly query_dto = ExpensesReadQueryDto;

  constructor(@Inject(FinanceService) private readonly financeService: FinanceService) {
    void ExpensesController.query_dto;
  }

  @Get()
  async list(@Query() query: ExpensesReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "occurredAt",
      allowedSortFields: ["occurredAt", "createdAt", "updatedAt", "expenseType", "amount"],
      statusField: "expenseType",
      statusValues: query.expenseType
    });

    const additionalFilters: FilterClause[] = [];
    if (query.relatedOrderId) {
      additionalFilters.push({
        field: "relatedOrderId",
        operator: "eq",
        value: query.relatedOrderId
      });
    }

    if (additionalFilters.length > 0) {
      readQuery.contract.filters = [...(readQuery.contract.filters ?? []), ...additionalFilters];
    }

    const result = await this.financeService.listExpenses(readQuery, access.user);
    return to_read_collection_response(result);
  }

  @Get(":expenseId")
  async detail(@Param("expenseId") expenseId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const expense = await this.financeService.getExpense(expenseId, access.user);
    if (!expense) {
      throw new NotFoundException(`Expense '${expenseId}' was not found`);
    }

    return { data: expense };
  }

  @Post()
  async create(@Body() payload: CreateExpenseDto, @Req() request: FinanceCommandRequest) {
    const access = get_authenticated_access(request);
    const shellContext = request.shellContext;
    const idempotencyKey = shellContext?.idempotencyKey;
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `${request_context_headers.idempotencyKey} header is required`
      });
    }

    const created = await this.financeService.createExpense(payload, access.user, {
      idempotencyKey,
      ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
      ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
    });
    return { data: created };
  }

  @Patch(":expenseId")
  async patch(
    @Param("expenseId") expenseId: string,
    @Body() payload: PatchExpenseDto,
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

    const updated = await this.financeService.updateExpense(expenseId, payload, access.user, {
      idempotencyKey,
      ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
      ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
    });
    return { data: updated };
  }
}
