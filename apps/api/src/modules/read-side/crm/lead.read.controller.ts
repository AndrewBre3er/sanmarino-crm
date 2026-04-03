import { Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../../contracts/openapi.contract";
import {
  build_read_collection_query,
  LeadsReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import { GetLeadDetailUseCase, ListLeadsUseCase } from "./lead.read.use-cases";

@ApiTags(api_openapi_tags.crmRead.name)
@Controller("leads")
export class LeadsReadController {
  private static readonly query_dto = LeadsReadQueryDto;

  constructor(
    @Inject(ListLeadsUseCase)
    private readonly listLeadsUseCase: ListLeadsUseCase,
    @Inject(GetLeadDetailUseCase)
    private readonly getLeadDetailUseCase: GetLeadDetailUseCase
  ) {
    void LeadsReadController.query_dto;
  }

  @Get()
  async list(@Query() query: LeadsReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "source", "status"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.listLeadsUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":leadId")
  async detail(@Param("leadId") leadId: string) {
    const lead = await this.getLeadDetailUseCase.execute(leadId);
    if (!lead) {
      throw new NotFoundException(`Lead '${leadId}' was not found`);
    }

    return { data: lead };
  }
}
