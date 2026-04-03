import { Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../../contracts/openapi.contract";
import {
  build_read_collection_query,
  DealsReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import { GetDealDetailUseCase, ListDealsUseCase } from "./deal.read.use-cases";

@ApiTags(api_openapi_tags.crmRead.name)
@Controller("deals")
export class DealsReadController {
  private static readonly query_dto = DealsReadQueryDto;

  constructor(
    @Inject(ListDealsUseCase)
    private readonly listDealsUseCase: ListDealsUseCase,
    @Inject(GetDealDetailUseCase)
    private readonly getDealDetailUseCase: GetDealDetailUseCase
  ) {
    void DealsReadController.query_dto;
  }

  @Get()
  async list(@Query() query: DealsReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "updatedAt",
      allowedSortFields: ["createdAt", "updatedAt", "status", "title"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.listDealsUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":dealId")
  async detail(@Param("dealId") dealId: string) {
    const deal = await this.getDealDetailUseCase.execute(dealId);
    if (!deal) {
      throw new NotFoundException(`Deal '${dealId}' was not found`);
    }

    return { data: deal };
  }
}
