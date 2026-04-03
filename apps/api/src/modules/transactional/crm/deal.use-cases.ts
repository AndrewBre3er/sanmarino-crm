import type { TransactionBoundaryContract } from "../../../common/persistence";
import { EntityNotFoundError } from "../shared/deferred-skeleton.error";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import { assert_deal_status_transition } from "./deal.transition.guard";
import type {
  CrmDealCreateInput,
  CrmDealRepositoryContract,
  CrmDealUpdateInput
} from "./deal.repository";

export interface DealUseCaseDependencies {
  dealRepository: CrmDealRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class CreateDealUseCase {
  constructor(private readonly dependencies: DealUseCaseDependencies) {}

  async execute(input: CrmDealCreateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const dealRepository = bind_repository_to_transaction(
          this.dependencies.dealRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return dealRepository.create(input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export class UpdateDealUseCase {
  constructor(private readonly dependencies: DealUseCaseDependencies) {}

  async execute(dealId: string, input: CrmDealUpdateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const dealRepository = bind_repository_to_transaction(
          this.dependencies.dealRepository,
          transactionContext
        );

        const currentDeal = await dealRepository.findById(dealId);
        if (!currentDeal) {
          throw new EntityNotFoundError("crm.deal", dealId);
        }

        if (input.status && input.status !== currentDeal.status) {
          assert_deal_status_transition(currentDeal.status, input.status);
        }

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return dealRepository.updateById(dealId, input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export const deal_use_case_deferred_todos = {
  adminOverridePath: "TODO",
  idempotency: "TODO",
  auditEvents: "TODO"
} as const;

