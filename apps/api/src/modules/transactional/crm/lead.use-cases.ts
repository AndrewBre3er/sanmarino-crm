import type { TransactionBoundaryContract } from "../../../common/persistence";
import {
  bind_repository_to_transaction,
  mark_side_effect_contracts_as_todo,
  to_repository_update_options,
  type UseCaseExecutionContext,
  type UseCaseSideEffectDependencies
} from "../shared/use-case.contract";
import type {
  CrmLeadCreateInput,
  CrmLeadRepositoryContract,
  CrmLeadUpdateInput
} from "./lead.repository";

export interface LeadUseCaseDependencies {
  leadRepository: CrmLeadRepositoryContract;
  transactionBoundary: TransactionBoundaryContract;
  sideEffects?: UseCaseSideEffectDependencies;
}

export class CreateLeadUseCase {
  constructor(private readonly dependencies: LeadUseCaseDependencies) {}

  async execute(input: CrmLeadCreateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const leadRepository = bind_repository_to_transaction(
          this.dependencies.leadRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return leadRepository.create(input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export class UpdateLeadUseCase {
  constructor(private readonly dependencies: LeadUseCaseDependencies) {}

  async execute(leadId: string, input: CrmLeadUpdateInput, context: UseCaseExecutionContext = {}) {
    return this.dependencies.transactionBoundary.runInTransaction(
      async transactionContext => {
        const leadRepository = bind_repository_to_transaction(
          this.dependencies.leadRepository,
          transactionContext
        );

        mark_side_effect_contracts_as_todo(this.dependencies.sideEffects);

        return leadRepository.updateById(leadId, input, to_repository_update_options(context));
      },
      context.transactionOptions
    );
  }
}

export const lead_use_case_deferred_todos = {
  idempotency: "TODO",
  auditEvents: "TODO",
  outboxEvents: "TODO"
} as const;

