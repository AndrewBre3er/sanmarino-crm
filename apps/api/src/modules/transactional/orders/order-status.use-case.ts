import type { TransactionBoundaryContract } from "../../../common/persistence";
import { EntityNotFoundError } from "../shared/deferred-skeleton.error";
import { assert_order_fulfillment_invariant } from "../shared/fulfillment-invariant.guard";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import { is_entering_delivery_flow_status, assert_order_status_transition } from "./order.transition.guard";
import type { LogisticsDeliveryTaskRepositoryContract } from "../logistics/delivery-task.repository";
import type { OrdersOrderRepositoryContract } from "./order.repository";
import type { OrderStatus } from "../shared/status.contract";

export interface TransitionOrderStatusInput {
  orderId: string;
  targetStatus: OrderStatus;
}

export interface TransitionOrderStatusUseCaseDependencies {
  orderRepository: OrdersOrderRepositoryContract;
  deliveryTaskRepository: LogisticsDeliveryTaskRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class TransitionOrderStatusUseCase {
  constructor(private readonly dependencies: TransitionOrderStatusUseCaseDependencies) {}

  async execute(input: TransitionOrderStatusInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const orderRepository = bind_repository_to_transaction(
          this.dependencies.orderRepository,
          transactionContext
        );
        const deliveryTaskRepository = bind_repository_to_transaction(
          this.dependencies.deliveryTaskRepository,
          transactionContext
        );

        const currentOrder = await orderRepository.findById(input.orderId);
        if (!currentOrder) {
          throw new EntityNotFoundError("orders.order", input.orderId);
        }

        assert_order_status_transition(currentOrder.status, input.targetStatus);

        const activeDeliveryTaskCount = await deliveryTaskRepository.countActiveByOrderId(
          input.orderId
        );

        assert_order_fulfillment_invariant(
          {
            orderId: input.orderId,
            fulfillmentType: currentOrder.fulfillmentType,
            activeDeliveryTaskCount
          },
          { enteringDeliveryFlow: is_entering_delivery_flow_status(input.targetStatus) }
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return orderRepository.updateById(
          input.orderId,
          { status: input.targetStatus },
          to_repository_update_options(context)
        );
      },
      context.transactionOptions
    );
  }
}

export const transition_order_status_use_case_deferred_todos = {
  outOfStockConflictHandling: "TODO",
  logisticsCompensationFlow: "TODO",
  idempotency: "TODO",
  outbox: "TODO"
} as const;

