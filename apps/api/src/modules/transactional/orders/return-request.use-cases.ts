import type { TransactionBoundaryContract } from "../../../common/persistence";
import { EntityNotFoundError } from "../shared/deferred-skeleton.error";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import { assert_return_request_status_transition } from "./return-request.transition.guard";
import type {
  OrdersReturnRequestCreateInput,
  OrdersReturnRequestRepositoryContract,
  OrdersReturnRequestUpdateInput
} from "./return-request.repository";

export interface ReturnRequestUseCaseDependencies {
  returnRequestRepository: OrdersReturnRequestRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class CreateReturnRequestUseCase {
  constructor(private readonly dependencies: ReturnRequestUseCaseDependencies) {}

  async execute(input: OrdersReturnRequestCreateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const returnRequestRepository = bind_repository_to_transaction(
          this.dependencies.returnRequestRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return returnRequestRepository.create(input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export class UpdateReturnRequestUseCase {
  constructor(private readonly dependencies: ReturnRequestUseCaseDependencies) {}

  async execute(
    returnRequestId: string,
    input: OrdersReturnRequestUpdateInput,
    context: UseCaseExecutionContext = {}
  ) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const returnRequestRepository = bind_repository_to_transaction(
          this.dependencies.returnRequestRepository,
          transactionContext
        );

        const currentRequest = await returnRequestRepository.findById(returnRequestId);
        if (!currentRequest) {
          throw new EntityNotFoundError("orders.return_request", returnRequestId);
        }

        if (input.status && input.status !== currentRequest.status) {
          assert_return_request_status_transition(currentRequest.status, input.status);
        }

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return returnRequestRepository.updateById(returnRequestId, input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export const return_request_use_case_deferred_todos = {
  returnItemDetails: "TODO",
  refundOrchestrator: "TODO",
  quarantineMovements: "TODO",
  idempotency: "TODO"
} as const;

