import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import {
  get_authenticated_access,
  type AuthenticatedRequestLike
} from "../auth/auth.access.helpers";
import {
  build_read_collection_query,
  OrdersReadQueryDto
} from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import { OrdersService } from "./orders.service";

@ApiTags(api_openapi_tags.ordersRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "warehouse", "logistics", "finance", "admin", "ceo")
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(@Query() query: OrdersReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
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

    const result = await this.ordersService.listOrders(
      readQuery,
      access.user,
      query.responsibleUserId
    );
    return to_read_collection_response(result);
  }

  @Get(":orderId")
  async detail(@Param("orderId") orderId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const order = await this.ordersService.getOrder(orderId, access.user);
    return { data: order };
  }
}
