import { Inject, Injectable } from "@nestjs/common";
import type { AuthPrincipal } from "../../auth/auth.contract";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaFinanceEntryReadRepository } from "./finance-entry.read.repository";
import { resolve_finance_entry_read_scope } from "./finance-entry.read.scope";

@Injectable()
export class ListFinanceEntriesUseCase {
  constructor(
    @Inject(PrismaFinanceEntryReadRepository)
    private readonly financeEntryRepository: PrismaFinanceEntryReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput, actor: Pick<AuthPrincipal, "userId" | "roleCodes">) {
    const scope = resolve_finance_entry_read_scope(actor);
    return this.financeEntryRepository.list(query, scope);
  }
}

@Injectable()
export class GetFinanceEntryDetailUseCase {
  constructor(
    @Inject(PrismaFinanceEntryReadRepository)
    private readonly financeEntryRepository: PrismaFinanceEntryReadRepository
  ) {}

  async execute(
    financeEntryId: string,
    includeDeleted = false,
    actor?: Pick<AuthPrincipal, "userId" | "roleCodes">
  ) {
    const scope = actor ? resolve_finance_entry_read_scope(actor) : undefined;
    return this.financeEntryRepository.getById(financeEntryId, includeDeleted, scope);
  }
}
