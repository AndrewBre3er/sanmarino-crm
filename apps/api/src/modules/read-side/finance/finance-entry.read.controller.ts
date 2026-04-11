import { Controller, Get, Inject, NotFoundException, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { FilterClause } from "../shared/read-model.contract";
import { api_openapi_tags } from "../../../contracts/openapi.contract";
import { require_roles } from "../../auth/auth.access.decorator";
import { AuthAccessGuard } from "../../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../../auth/auth.access.helpers";
import {
  build_read_collection_query,
  FinanceEntriesReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import { GetFinanceEntryDetailUseCase, ListFinanceEntriesUseCase } from "./finance-entry.read.use-cases";

@ApiTags(api_openapi_tags.paymentsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "finance", "admin", "ceo")
@Controller("finance-entries")
export class FinanceEntriesReadController {
  private static readonly query_dto = FinanceEntriesReadQueryDto;

  constructor(
    @Inject(ListFinanceEntriesUseCase)
    private readonly listFinanceEntriesUseCase: ListFinanceEntriesUseCase,
    @Inject(GetFinanceEntryDetailUseCase)
    private readonly getFinanceEntryDetailUseCase: GetFinanceEntryDetailUseCase
  ) {
    void FinanceEntriesReadController.query_dto;
  }

  @Get()
  async list(@Query() query: FinanceEntriesReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "recognizedAt",
      allowedSortFields: ["recognizedAt", "createdAt", "updatedAt", "entryType", "amount"],
      statusField: "entryType",
      statusValues: query.entryType
    });

    const additionalFilters: FilterClause[] = [];
    if (query.orderId) {
      additionalFilters.push({
        field: "orderId",
        operator: "eq",
        value: query.orderId
      });
    }

    if (query.paymentId) {
      additionalFilters.push({
        field: "paymentId",
        operator: "eq",
        value: query.paymentId
      });
    }

    if (additionalFilters.length > 0) {
      readQuery.contract.filters = [...(readQuery.contract.filters ?? []), ...additionalFilters];
    }

    const result = await this.listFinanceEntriesUseCase.execute(readQuery, access.user);
    return to_read_collection_response(result);
  }

  @Get(":financeEntryId")
  async detail(@Param("financeEntryId") financeEntryId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const entry = await this.getFinanceEntryDetailUseCase.execute(financeEntryId, false, access.user);
    if (!entry) {
      throw new NotFoundException(`Finance entry '${financeEntryId}' was not found`);
    }

    return { data: entry };
  }
}
