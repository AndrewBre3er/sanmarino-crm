import { Controller, Get, Inject, NotFoundException, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../../contracts/openapi.contract";
import { require_roles } from "../../auth/auth.access.decorator";
import { AuthAccessGuard } from "../../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../../auth/auth.access.helpers";
import {
  build_read_collection_query,
  DeliveryTasksReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import {
  GetDeliveryTaskDetailUseCase,
  ListDeliveryTasksUseCase
} from "./delivery-task.read.use-cases";
import { resolve_delivery_task_read_scope } from "./delivery-task.read.scope";

@ApiTags(api_openapi_tags.logisticsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "logistics", "admin", "ceo")
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
  async list(
    @Query() query: DeliveryTasksReadQueryDto,
    @Req() request: AuthenticatedRequestLike
  ) {
    const access = get_authenticated_access(request);
    const scope = resolve_delivery_task_read_scope(access.user);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "plannedDate", "status", "sequenceNo"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.listDeliveryTasksUseCase.execute(readQuery, scope);
    return to_read_collection_response(result);
  }

  @Get(":taskId")
  async detail(@Param("taskId") taskId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const scope = resolve_delivery_task_read_scope(access.user);
    const task = await this.getDeliveryTaskDetailUseCase.execute(taskId, scope);
    if (!task) {
      throw new NotFoundException(`Delivery task '${taskId}' was not found`);
    }

    return { data: task };
  }
}
