import { Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../../contracts/openapi.contract";
import {
  build_read_collection_query,
  ReturnRequestsReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import {
  GetReturnRequestDetailUseCase,
  ListReturnRequestsUseCase
} from "./return-request.read.use-cases";

@ApiTags(api_openapi_tags.returnsRead.name)
@Controller("return-requests")
export class ReturnRequestsReadController {
  private static readonly query_dto = ReturnRequestsReadQueryDto;

  constructor(
    @Inject(ListReturnRequestsUseCase)
    private readonly listReturnRequestsUseCase: ListReturnRequestsUseCase,
    @Inject(GetReturnRequestDetailUseCase)
    private readonly getReturnRequestDetailUseCase: GetReturnRequestDetailUseCase
  ) {
    void ReturnRequestsReadController.query_dto;
  }

  @Get()
  async list(@Query() query: ReturnRequestsReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "status", "submittedAt", "processedAt"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.listReturnRequestsUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":returnRequestId")
  async detail(@Param("returnRequestId") returnRequestId: string) {
    const returnRequest = await this.getReturnRequestDetailUseCase.execute(returnRequestId);
    if (!returnRequest) {
      throw new NotFoundException(`Return request '${returnRequestId}' was not found`);
    }

    return { data: returnRequest };
  }
}
