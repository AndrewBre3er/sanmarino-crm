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
  PaymentsReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import { GetPaymentDetailUseCase, ListPaymentsUseCase } from "./payment.read.use-cases";

@ApiTags(api_openapi_tags.paymentsRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "warehouse", "logistics", "finance", "admin", "ceo")
@Controller("payments")
export class PaymentsReadController {
  private static readonly query_dto = PaymentsReadQueryDto;

  constructor(
    @Inject(ListPaymentsUseCase)
    private readonly listPaymentsUseCase: ListPaymentsUseCase,
    @Inject(GetPaymentDetailUseCase)
    private readonly getPaymentDetailUseCase: GetPaymentDetailUseCase
  ) {
    void PaymentsReadController.query_dto;
  }

  @Get()
  async list(@Query() query: PaymentsReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "createdAt",
      allowedSortFields: ["createdAt", "updatedAt", "paymentNumber", "status", "receivedAt"],
      statusField: "status",
      statusValues: query.status
    });

    const result = await this.listPaymentsUseCase.execute(readQuery, access.user);
    return to_read_collection_response(result);
  }

  @Get(":paymentId")
  async detail(@Param("paymentId") paymentId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const payment = await this.getPaymentDetailUseCase.execute(paymentId, false, access.user);
    if (!payment) {
      throw new NotFoundException(`Payment '${paymentId}' was not found`);
    }

    return { data: payment };
  }
}
