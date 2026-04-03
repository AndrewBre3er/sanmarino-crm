import { Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../../contracts/openapi.contract";
import {
  build_read_collection_query,
  OrdersReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import { GetOrderDetailUseCase, ListOrdersUseCase } from "./order.read.use-cases";

@ApiTags(api_openapi_tags.ordersRead.name)
@Controller("orders")
export class OrdersReadController {
  private static readonly query_dto = OrdersReadQueryDto;

  constructor(
    @Inject(ListOrdersUseCase)
    private readonly listOrdersUseCase: ListOrdersUseCase,
    @Inject(GetOrderDetailUseCase)
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase
  ) {
    void OrdersReadController.query_dto;
  }

  @Get()
  async list(@Query() query: OrdersReadQueryDto) {
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: [
        "createdAt",
        "updatedAt",
        "orderNumber",
        "status",
        "fulfillmentType",
        "deliveryStatus"
      ],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.listOrdersUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }

  @Get(":orderId")
  async detail(@Param("orderId") orderId: string) {
    const order = await this.getOrderDetailUseCase.execute(orderId);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found`);
    }

    return { data: order };
  }
}
