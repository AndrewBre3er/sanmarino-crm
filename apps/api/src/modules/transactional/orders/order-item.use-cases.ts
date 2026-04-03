import type { TransactionBoundaryContract } from "../../../common/persistence";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import type {
  OrdersOrderItemCreateInput,
  OrdersOrderItemRepositoryContract,
  OrdersOrderItemUpdateInput
} from "./order-item.repository";

export interface OrderItemUseCaseDependencies {
  orderItemRepository: OrdersOrderItemRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class AddOrderItemUseCase {
  constructor(private readonly dependencies: OrderItemUseCaseDependencies) {}

  async execute(input: OrdersOrderItemCreateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const orderItemRepository = bind_repository_to_transaction(
          this.dependencies.orderItemRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return orderItemRepository.create(input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export class UpdateOrderItemUseCase {
  constructor(private readonly dependencies: OrderItemUseCaseDependencies) {}

  async execute(
    orderItemId: string,
    input: OrdersOrderItemUpdateInput,
    context: UseCaseExecutionContext = {}
  ) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const orderItemRepository = bind_repository_to_transaction(
          this.dependencies.orderItemRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return orderItemRepository.updateById(orderItemId, input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export const order_item_use_case_deferred_todos = {
  postConfirmMutationPolicy: "TODO",
  priceSourceValidation: "TODO",
  costSnapshotPolicy: "TODO"
} as const;

