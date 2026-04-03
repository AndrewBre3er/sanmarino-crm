import type { TransactionBoundaryContract } from "../../../common/persistence";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import type { OrdersOrderCreateInput, OrdersOrderRepositoryContract } from "./order.repository";

export interface OrderUseCaseDependencies {
  orderRepository: OrdersOrderRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class CreateOrderUseCase {
  constructor(private readonly dependencies: OrderUseCaseDependencies) {}

  async execute(input: OrdersOrderCreateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const orderRepository = bind_repository_to_transaction(
          this.dependencies.orderRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return orderRepository.create(input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export const create_order_use_case_deferred_todos = {
  preConfirmStockChecks: "TODO",
  logisticsPrechecks: "TODO",
  idempotency: "TODO"
} as const;

