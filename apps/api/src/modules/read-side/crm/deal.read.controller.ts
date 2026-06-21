import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
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
  DealsReadQueryDto
} from "../shared/read-query.dto";
import { to_read_collection_response } from "../shared/read-response";
import { GetDealDetailUseCase, ListDealsUseCase } from "./deal.read.use-cases";
import type { CrmDealReadScope } from "./deal.read.repository";

@ApiTags(api_openapi_tags.crmRead.name)
@UseGuards(AuthAccessGuard)
@require_roles("seller", "admin", "ceo")
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
  async list(@Query() query: DealsReadQueryDto, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const readQuery = build_read_collection_query(query, {
      defaultSortField: "updatedAt",
      allowedSortFields: ["createdAt", "updatedAt", "status", "title", "nextContactAt"],
      statusField: "status",
      statusValues: query.status
    });

    const scope = resolve_deal_scope(access.user, query.responsibleUserId);
    const result = await this.listDealsUseCase.execute(readQuery, scope);
    return to_read_collection_response(result);
  }

  @Get(":dealId")
  async detail(@Param("dealId") dealId: string, @Req() request: AuthenticatedRequestLike) {
    const access = get_authenticated_access(request);
    const scope = resolve_deal_scope(access.user);
    const deal = await this.getDealDetailUseCase.execute(dealId, false, scope);
    if (!deal) {
      throw new NotFoundException(`Deal '${dealId}' was not found`);
    }

    return { data: deal };
  }
}

function resolve_deal_scope(
  actor: { userId: string; roleCodes: readonly string[] },
  requestedResponsibleUserId?: string
): CrmDealReadScope | undefined {
  const isPrivileged = actor.roleCodes.includes("admin") || actor.roleCodes.includes("ceo");
  if (isPrivileged) {
    return requestedResponsibleUserId ? { responsibleUserId: requestedResponsibleUserId } : undefined;
  }

  if (requestedResponsibleUserId && requestedResponsibleUserId !== actor.userId) {
    throw new ForbiddenException({
      code: "ACCESS_DENIED",
      message: "Seller can filter deals only by own user id"
    });
  }

  return { responsibleUserId: actor.userId };
}
