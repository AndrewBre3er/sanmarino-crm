import { Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../../contracts/openapi.contract";
import {
  build_read_collection_query,
  DeliveryTasksReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import {
  GetDeliveryTaskDetailUseCase,
  ListDeliveryTasksUseCase
} from "./delivery-task.read.use-cases";

@ApiTags(api_openapi_tags.logisticsRead.name)
@Controller("delivery-tasks")
export class DeliveryTasksReadController {
  private static readonly query_dto = DeliveryTasksReadQueryDto;

  constructor(
    @Inject(ListDeliveryTasksUseCase)
    private readonly listDeliveryTasksUseCase: ListDeliveryTasksUseCase,
    @Inject(GetDeliveryTaskDetailUseCase)
    private readonly getDeliveryTaskDetailUseCase: GetDeliveryTaskDetailUseCase
  ) {
    void DeliveryTasksReadController.query_dto;
  }

  @Get()
  async list(@Query() query: DeliveryTasksReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "plannedDate", "status", "sequenceNo"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.listDeliveryTasksUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":taskId")
  async detail(@Param("taskId") taskId: string) {
    const task = await this.getDeliveryTaskDetailUseCase.execute(taskId);
    if (!task) {
      throw new NotFoundException(`Delivery task '${taskId}' was not found`);
    }

    return { data: task };
  }
}
