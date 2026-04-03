import type { TransactionBoundaryContract } from "../../../common/persistence";
import { EntityNotFoundError } from "../shared/deferred-skeleton.error";
import { assert_order_fulfillment_invariant } from "../shared/fulfillment-invariant.guard";
import { is_active_delivery_task_status } from "../shared/status.contract";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import { assert_delivery_task_status_transition } from "./delivery-task.transition.guard";
import type {
  LogisticsDeliveryTaskCreateInput,
  LogisticsDeliveryTaskRepositoryContract,
  LogisticsDeliveryTaskUpdateInput
} from "./delivery-task.repository";
import type { OrdersOrderRepositoryContract } from "../orders/order.repository";

export interface DeliveryTaskUseCaseDependencies {
  deliveryTaskRepository: LogisticsDeliveryTaskRepositoryContract;
  orderRepository: OrdersOrderRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class CreateDeliveryTaskUseCase {
  constructor(private readonly dependencies: DeliveryTaskUseCaseDependencies) {}

  async execute(input: LogisticsDeliveryTaskCreateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const deliveryTaskRepository = bind_repository_to_transaction(
          this.dependencies.deliveryTaskRepository,
          transactionContext
        );
        const orderRepository = bind_repository_to_transaction(
          this.dependencies.orderRepository,
          transactionContext
        );

        const order = await orderRepository.findById(input.orderId);
        if (!order) {
          throw new EntityNotFoundError("orders.order", input.orderId);
        }

        const activeTaskCount = await deliveryTaskRepository.countActiveByOrderId(input.orderId);
        const nextActiveTaskCount =
          activeTaskCount + (is_active_delivery_task_status(input.status) ? 1 : 0);

        assert_order_fulfillment_invariant(
          {
            orderId: order.id,
            fulfillmentType: order.fulfillmentType,
            activeDeliveryTaskCount: nextActiveTaskCount
          },
          { enteringDeliveryFlow: false }
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return deliveryTaskRepository.create(input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export class UpdateDeliveryTaskUseCase {
  constructor(private readonly dependencies: DeliveryTaskUseCaseDependencies) {}

  async execute(
    taskId: string,
    input: LogisticsDeliveryTaskUpdateInput,
    context: UseCaseExecutionContext = {}
  ) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const deliveryTaskRepository = bind_repository_to_transaction(
          this.dependencies.deliveryTaskRepository,
          transactionContext
        );
        const orderRepository = bind_repository_to_transaction(
          this.dependencies.orderRepository,
          transactionContext
        );

        const currentTask = await deliveryTaskRepository.findById(taskId);
        if (!currentTask) {
          throw new EntityNotFoundError("logistics.delivery_task", taskId);
        }

        const nextStatus = input.status ?? currentTask.status;
        if (nextStatus !== currentTask.status) {
          assert_delivery_task_status_transition(currentTask.status, nextStatus);
        }

        const order = await orderRepository.findById(currentTask.orderId);
        if (!order) {
          throw new EntityNotFoundError("orders.order", currentTask.orderId);
        }

        const activeTaskCount = await deliveryTaskRepository.countActiveByOrderId(currentTask.orderId);
        const currentTaskActive = is_active_delivery_task_status(currentTask.status) ? 1 : 0;
        const nextTaskActive = is_active_delivery_task_status(nextStatus) ? 1 : 0;
        const nextActiveTaskCount = Math.max(0, activeTaskCount - currentTaskActive + nextTaskActive);

        assert_order_fulfillment_invariant(
          {
            orderId: order.id,
            fulfillmentType: order.fulfillmentType,
            activeDeliveryTaskCount: nextActiveTaskCount
          },
          { enteringDeliveryFlow: false }
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return deliveryTaskRepository.updateById(taskId, input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export const delivery_task_use_case_deferred_todos = {
  routeCapacityChecks: "TODO",
  slotCapacityChecks: "TODO",
  driverAssignmentPolicy: "TODO",
  idempotency: "TODO"
} as const;

