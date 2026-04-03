import type { TransactionBoundaryContract } from "../../../common/persistence";
import { EntityNotFoundError } from "../shared/deferred-skeleton.error";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import { assert_payment_status_transition } from "./payment.transition.guard";
import type {
  PaymentsPaymentCreateInput,
  PaymentsPaymentRepositoryContract,
  PaymentsPaymentUpdateInput
} from "./payment.repository";

export interface PaymentUseCaseDependencies {
  paymentRepository: PaymentsPaymentRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class RegisterPaymentUseCase {
  constructor(private readonly dependencies: PaymentUseCaseDependencies) {}

  async execute(input: PaymentsPaymentCreateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const paymentRepository = bind_repository_to_transaction(
          this.dependencies.paymentRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return paymentRepository.create(input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export class UpdatePaymentUseCase {
  constructor(private readonly dependencies: PaymentUseCaseDependencies) {}

  async execute(
    paymentId: string,
    input: PaymentsPaymentUpdateInput,
    context: UseCaseExecutionContext = {}
  ) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const paymentRepository = bind_repository_to_transaction(
          this.dependencies.paymentRepository,
          transactionContext
        );

        const currentPayment = await paymentRepository.findById(paymentId);
        if (!currentPayment) {
          throw new EntityNotFoundError("payments.payment", paymentId);
        }

        if (input.status && input.status !== currentPayment.status) {
          assert_payment_status_transition(currentPayment.status, input.status);
        }

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return paymentRepository.updateById(paymentId, input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export const payment_use_case_deferred_todos = {
  refundFlowCoordination: "TODO",
  financeIncomeHook: "TODO",
  idempotency: "TODO",
  outbox: "TODO"
} as const;

