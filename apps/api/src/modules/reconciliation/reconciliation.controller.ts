import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Matches } from "class-validator";
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
import { to_read_collection_response } from "../read-side/shared/read-response";
import { ReconciliationService } from "./reconciliation.service";

const reconciliation_report_statuses = ["running", "completed", "failed"] as const;
type ReconciliationReportStatus = (typeof reconciliation_report_statuses)[number];

function trim_to_undefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

class ReconciliationReportsQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsIn(reconciliation_report_statuses)
  status?: ReconciliationReportStatus;
}

class RunReconciliationDto {
  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  reportDate?: string;
}

interface ReconciliationCommandRequest extends AuthenticatedRequestLike {
  shellContext?: {
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
}

@ApiTags(api_openapi_tags.paymentsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("finance", "admin", "ceo")
@Controller()
export class ReconciliationController {
  constructor(
    @Inject(ReconciliationService)
    private readonly reconciliationService: ReconciliationService
  ) {}

  @Get("reconciliation-reports")
  async list(
    @Query() query: ReconciliationReportsQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "reportDate",
      allowedSortFields: ["reportDate", "createdAt", "updatedAt", "issuesCount", "status"],
      statusField: "status",
      statusValues: query.status ? [query.status] : undefined
    });

    const result = await this.reconciliationService.listReports(readQuery, access.user);
    return to_read_collection_response(result);
  }

  @Get("reconciliation-reports/:reportId")
  async detail(
    @Param("reportId") reportId: string,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const report = await this.reconciliationService.getReport(reportId, access.user);
    return { data: report };
  }

  @Post("reconciliation-runs")
  async run(
    @Body() payload: RunReconciliationDto,
    @Req() request: ReconciliationCommandRequest
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

    const report = await this.reconciliationService.runReconciliation(
      {
        ...(payload.reportDate ? { reportDate: payload.reportDate } : {})
      },
      access.user,
      {
        idempotencyKey,
        ...(shellContext?.requestId ? { requestId: shellContext.requestId } : {}),
        ...(shellContext?.correlationId ? { correlationId: shellContext.correlationId } : {})
      }
    );

    return { data: report };
  }
}
