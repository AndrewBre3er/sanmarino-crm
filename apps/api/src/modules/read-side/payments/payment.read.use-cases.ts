import { Inject, Injectable } from "@nestjs/common";
import type { AuthPrincipal } from "../../auth/auth.contract";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { resolve_payment_read_scope } from "./payment.read.scope";
import { PrismaPaymentsPaymentReadRepository } from "./payment.read.repository";

@Injectable()
export class ListPaymentsUseCase {
  constructor(
    @Inject(PrismaPaymentsPaymentReadRepository)
    private readonly paymentRepository: PrismaPaymentsPaymentReadRepository
  ) {}

  async execute(
    query: ReadCollectionQueryInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    requestedResponsibleUserId?: string
  ) {
    const scope = resolve_payment_read_scope(actor, requestedResponsibleUserId);
    return this.paymentRepository.list(query, scope);
  }
}

@Injectable()
export class GetPaymentDetailUseCase {
  constructor(
    @Inject(PrismaPaymentsPaymentReadRepository)
    private readonly paymentRepository: PrismaPaymentsPaymentReadRepository
  ) {}

  async execute(
    paymentId: string,
    includeDeleted = false,
    actor?: Pick<AuthPrincipal, "userId" | "roleCodes">
  ) {
    const scope = actor ? resolve_payment_read_scope(actor) : undefined;
    return this.paymentRepository.getById(paymentId, includeDeleted, scope);
  }
}
