import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  ExpenseType as PrismaExpenseType,
  FinanceCorrectionStatus as PrismaFinanceCorrectionStatus,
  FinanceEntryType as PrismaFinanceEntryType,
  FinanceExpense,
  FinanceManualCorrection,
  FinanceMarketingExpense,
  IdempotencyStatus as PrismaIdempotencyStatus
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import {
  from_prisma_enum,
  to_decimal_string,
  to_iso_datetime,
  to_prisma_enum
} from "../read-side/shared/prisma-read.mapper";
import type { ExpenseType } from "../transactional/shared/status.contract";
import type { FinanceCorrectionStatus } from "../transactional/shared/status.contract";
import { PrismaService } from "../../prisma/prisma.service";

const finance_allowed_roles = new Set(["finance", "admin", "ceo"] as const);
const manual_correction_read_roles = new Set(["finance", "ceo"] as const);
const manual_correction_finance_command_roles = new Set(["finance"] as const);
const manual_correction_ceo_command_roles = new Set(["ceo"] as const);
const create_expense_idempotency_scope = "finance.expense.create.v1";
const update_expense_idempotency_scope = "finance.expense.update.v1";
const create_marketing_expense_idempotency_scope = "finance.marketing_expense.create.v1";
const update_marketing_expense_idempotency_scope = "finance.marketing_expense.update.v1";
const create_manual_correction_idempotency_scope = "finance.manual_correction.create.v1";
const submit_manual_correction_idempotency_scope =
  "finance.manual_correction.submit_for_approval.v1";
const approve_manual_correction_idempotency_scope = "finance.manual_correction.approve.v1";
const reject_manual_correction_idempotency_scope = "finance.manual_correction.reject.v1";
const apply_manual_correction_idempotency_scope = "finance.manual_correction.apply.v1";
const manual_correction_entity_type = "finance.manual_correction";

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

export interface FinanceCommandContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

export interface ExpenseReadModel {
  id: string;
  expenseType: ExpenseType;
  amount: string;
  currency: string;
  occurredAt: string;
  description: string | null;
  relatedOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingExpenseReadModel {
  id: string;
  source: string;
  campaign: string | null;
  amount: string;
  currency: string;
  occurredAt: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManualCorrectionReconciliationReference {
  reportId: string;
  pair: string;
  leftEntityRef: string;
  rightEntityRef: string;
  recommendedAction: string;
}

export interface ManualCorrectionPayload {
  amount: string;
  currency: string;
  recognizedAt: string;
  reason: string;
  description: string | null;
  relatedOrderId: string | null;
  reconciliationReference: ManualCorrectionReconciliationReference | null;
}

export interface ManualCorrectionReadModel {
  id: string;
  status: FinanceCorrectionStatus;
  reason: string;
  requestedByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  appliedAt: string | null;
  appliedEntryId: string | null;
  payload: ManualCorrectionPayload;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  expenseType: ExpenseType;
  amount: string;
  currency?: string;
  occurredAt: string;
  description?: string;
  relatedOrderId?: string;
}

export interface UpdateExpenseInput {
  expenseType?: ExpenseType;
  amount?: string;
  currency?: string;
  occurredAt?: string;
  description?: string;
  relatedOrderId?: string;
}

export interface CreateMarketingExpenseInput {
  source: string;
  campaign?: string;
  amount: string;
  currency?: string;
  occurredAt: string;
  description?: string;
}

export interface UpdateMarketingExpenseInput {
  source?: string;
  campaign?: string;
  amount?: string;
  currency?: string;
  occurredAt?: string;
  description?: string;
}

export interface CreateManualCorrectionInput {
  amount: string;
  currency?: string;
  recognizedAt: string;
  reason: string;
  description?: string;
  relatedOrderId?: string;
  reconciliationReference?: Record<string, unknown>;
}

export interface RejectManualCorrectionInput {
  reason: string;
}

interface NormalizedExpenseUpdateInput {
  expenseType?: ExpenseType;
  amount?: string;
  currency?: string;
  occurredAt?: Date;
  description?: string | null;
  relatedOrderId?: string;
}

interface NormalizedMarketingExpenseUpdateInput {
  source?: string;
  campaign?: string | null;
  amount?: string;
  currency?: string;
  occurredAt?: Date;
  description?: string | null;
}

@Injectable()
export class FinanceService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listExpenses(
    query: ReadCollectionQueryInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<ReadCollectionResult<ExpenseReadModel>> {
    this.assert_finance_access(actor);
    const and_clauses: Prisma.FinanceExpenseWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        description: { contains: query.search, mode: "insensitive" }
      });
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) => to_prisma_enum<PrismaExpenseType>(value));
      const [first_expense_type] = mapped;
      if (mapped.length === 1 && first_expense_type) {
        and_clauses.push({ expenseType: first_expense_type });
      } else {
        and_clauses.push({ expenseType: { in: mapped } });
      }
    }

    const relatedOrderId = extract_eq_filter(query, "relatedOrderId");
    if (relatedOrderId) {
      and_clauses.push({ relatedOrderId });
    }

    const where: Prisma.FinanceExpenseWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.FinanceExpenseOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.financeExpense.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.financeExpense.count({ where })
    ]);

    return {
      items: items.map(map_expense_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getExpense(
    expenseId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<ExpenseReadModel> {
    this.assert_finance_access(actor);
    const expense = await this.prismaService.financeExpense.findFirst({
      where: {
        id: expenseId
      }
    });
    if (!expense) {
      throw new NotFoundException(`Expense '${expenseId}' was not found`);
    }

    return map_expense_read_model(expense);
  }

  async createExpense(
    input: CreateExpenseInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<ExpenseReadModel> {
    this.assert_finance_access(actor);
    const normalizedAmount = normalize_amount(input.amount);
    const normalizedCurrency = normalize_currency(input.currency);
    const occurredAt = normalize_datetime(input.occurredAt, "occurredAt");
    const description = normalize_optional_text(input.description);
    const relatedOrderId = input.relatedOrderId ?? null;
    const requestHash = build_create_expense_request_hash({
      expenseType: input.expenseType,
      amount: normalizedAmount,
      currency: normalizedCurrency,
      occurredAt: occurredAt.toISOString(),
      description,
      relatedOrderId
    });

    const idempotency = await this.acquire_idempotency(
      create_expense_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_expense(idempotency.responseBody, actor);
    }

    try {
      if (relatedOrderId) {
        await this.assert_order_exists(relatedOrderId);
      }

      const createdExpenseId = await this.prismaService.$transaction(async (transactionClient) => {
        const createdExpense = await transactionClient.financeExpense.create({
          data: {
            expenseType: to_prisma_enum<PrismaExpenseType>(input.expenseType),
            amount: normalizedAmount,
            currency: normalizedCurrency,
            occurredAt,
            description,
            ...(relatedOrderId
              ? {
                  relatedOrder: {
                    connect: {
                      id: relatedOrderId
                    }
                  }
                }
              : {}),
            createdByUser: {
              connect: {
                id: actor.userId
              }
            }
          },
          select: {
            id: true,
            relatedOrderId: true
          }
        });

        await transactionClient.financeFinanceEntry.create({
          data: {
            entryType: to_prisma_enum<PrismaFinanceEntryType>("expense"),
            expense: {
              connect: {
                id: createdExpense.id
              }
            },
            ...(createdExpense.relatedOrderId
              ? {
                  order: {
                    connect: {
                      id: createdExpense.relatedOrderId
                    }
                  }
                }
              : {}),
            amount: normalizedAmount,
            currency: normalizedCurrency,
            recognizedAt: occurredAt,
            description: description ?? "Confirmed expense recorded",
            createdByUser: {
              connect: {
                id: actor.userId
              }
            }
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { expenseId: createdExpense.id },
            lockedUntil: null
          }
        });

        return createdExpense.id;
      });

      return this.getExpense(createdExpenseId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async updateExpense(
    expenseId: string,
    input: UpdateExpenseInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<ExpenseReadModel> {
    this.assert_finance_access(actor);
    const normalizedInput = normalize_expense_update_input(input);
    const requestHash = build_update_expense_request_hash(expenseId, normalizedInput);

    const idempotency = await this.acquire_idempotency(
      update_expense_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_expense(idempotency.responseBody, actor, expenseId);
    }

    try {
      if (normalizedInput.relatedOrderId) {
        await this.assert_order_exists(normalizedInput.relatedOrderId);
      }

      const updatedExpenseId = await this.prismaService.$transaction(async (transactionClient) => {
        const existing = await transactionClient.financeExpense.findFirst({
          where: {
            id: expenseId
          },
          select: {
            id: true
          }
        });

        if (!existing) {
          throw new NotFoundException(`Expense '${expenseId}' was not found`);
        }

        await transactionClient.financeExpense.update({
          where: {
            id: expenseId
          },
          data: build_expense_update_data(normalizedInput)
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { expenseId },
            lockedUntil: null
          }
        });

        return expenseId;
      });

      return this.getExpense(updatedExpenseId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async listMarketingExpenses(
    query: ReadCollectionQueryInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<ReadCollectionResult<MarketingExpenseReadModel>> {
    this.assert_finance_access(actor);
    const and_clauses: Prisma.FinanceMarketingExpenseWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        OR: [
          { source: { contains: query.search, mode: "insensitive" } },
          { campaign: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    const source = extract_eq_filter(query, "source");
    if (source) {
      and_clauses.push({ source });
    }

    const where: Prisma.FinanceMarketingExpenseWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.FinanceMarketingExpenseOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.financeMarketingExpense.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.financeMarketingExpense.count({ where })
    ]);

    return {
      items: items.map(map_marketing_expense_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getMarketingExpense(
    marketingExpenseId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<MarketingExpenseReadModel> {
    this.assert_finance_access(actor);
    const marketingExpense = await this.prismaService.financeMarketingExpense.findFirst({
      where: {
        id: marketingExpenseId
      }
    });
    if (!marketingExpense) {
      throw new NotFoundException(`Marketing expense '${marketingExpenseId}' was not found`);
    }

    return map_marketing_expense_read_model(marketingExpense);
  }

  async createMarketingExpense(
    input: CreateMarketingExpenseInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<MarketingExpenseReadModel> {
    this.assert_finance_access(actor);
    const normalizedAmount = normalize_amount(input.amount);
    const normalizedCurrency = normalize_currency(input.currency);
    const occurredAt = normalize_datetime(input.occurredAt, "occurredAt");
    const normalizedSource = normalize_required_text(input.source, "source", 128);
    const campaign = normalize_optional_text(input.campaign);
    const description = normalize_optional_text(input.description);
    const requestHash = build_create_marketing_expense_request_hash({
      source: normalizedSource,
      campaign,
      amount: normalizedAmount,
      currency: normalizedCurrency,
      occurredAt: occurredAt.toISOString(),
      description
    });

    const idempotency = await this.acquire_idempotency(
      create_marketing_expense_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_marketing_expense(idempotency.responseBody, actor);
    }

    try {
      const createdMarketingExpenseId = await this.prismaService.$transaction(
        async (transactionClient) => {
          const createdMarketingExpense = await transactionClient.financeMarketingExpense.create({
            data: {
              source: normalizedSource,
              campaign,
              amount: normalizedAmount,
              currency: normalizedCurrency,
              occurredAt,
              description,
              createdByUser: {
                connect: {
                  id: actor.userId
                }
              }
            },
            select: {
              id: true
            }
          });

          await transactionClient.financeFinanceEntry.create({
            data: {
              entryType: to_prisma_enum<PrismaFinanceEntryType>("expense"),
              marketingExpense: {
                connect: {
                  id: createdMarketingExpense.id
                }
              },
              amount: normalizedAmount,
              currency: normalizedCurrency,
              recognizedAt: occurredAt,
              description:
                description ??
                `Marketing expense recorded (${normalizedSource}${campaign ? `/${campaign}` : ""})`,
              createdByUser: {
                connect: {
                  id: actor.userId
                }
              }
            }
          });

          await transactionClient.systemIdempotencyRecord.update({
            where: { id: idempotency.recordId },
            data: {
              status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
              responseStatusCode: 200,
              responseBody: { marketingExpenseId: createdMarketingExpense.id },
              lockedUntil: null
            }
          });

          return createdMarketingExpense.id;
        }
      );

      return this.getMarketingExpense(createdMarketingExpenseId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async updateMarketingExpense(
    marketingExpenseId: string,
    input: UpdateMarketingExpenseInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<MarketingExpenseReadModel> {
    this.assert_finance_access(actor);
    const normalizedInput = normalize_marketing_expense_update_input(input);
    const requestHash = build_update_marketing_expense_request_hash(
      marketingExpenseId,
      normalizedInput
    );

    const idempotency = await this.acquire_idempotency(
      update_marketing_expense_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_marketing_expense(
        idempotency.responseBody,
        actor,
        marketingExpenseId
      );
    }

    try {
      const updatedMarketingExpenseId = await this.prismaService.$transaction(
        async (transactionClient) => {
          const existing = await transactionClient.financeMarketingExpense.findFirst({
            where: {
              id: marketingExpenseId
            },
            select: {
              id: true
            }
          });

          if (!existing) {
            throw new NotFoundException(`Marketing expense '${marketingExpenseId}' was not found`);
          }

          await transactionClient.financeMarketingExpense.update({
            where: {
              id: marketingExpenseId
            },
            data: build_marketing_expense_update_data(normalizedInput)
          });

          await transactionClient.systemIdempotencyRecord.update({
            where: { id: idempotency.recordId },
            data: {
              status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
              responseStatusCode: 200,
              responseBody: { marketingExpenseId },
              lockedUntil: null
            }
          });

          return marketingExpenseId;
        }
      );

      return this.getMarketingExpense(updatedMarketingExpenseId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async listManualCorrections(
    query: ReadCollectionQueryInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<ReadCollectionResult<ManualCorrectionReadModel>> {
    this.assert_manual_correction_read_access(actor);
    const and_clauses: Prisma.FinanceManualCorrectionWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        reason: { contains: query.search, mode: "insensitive" }
      });
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) =>
        to_prisma_enum<PrismaFinanceCorrectionStatus>(value)
      );
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        and_clauses.push({ status: first_status });
      } else {
        and_clauses.push({ status: { in: mapped } });
      }
    }

    const where: Prisma.FinanceManualCorrectionWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.FinanceManualCorrectionOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.financeManualCorrection.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.financeManualCorrection.count({ where })
    ]);

    return {
      items: items.map(map_manual_correction_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getManualCorrection(
    correctionId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<ManualCorrectionReadModel> {
    this.assert_manual_correction_read_access(actor);
    const correction = await this.prismaService.financeManualCorrection.findFirst({
      where: {
        id: correctionId
      }
    });
    if (!correction) {
      throw new NotFoundException(`Finance correction '${correctionId}' was not found`);
    }

    return map_manual_correction_read_model(correction);
  }

  async createManualCorrection(
    input: CreateManualCorrectionInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<ManualCorrectionReadModel> {
    this.assert_manual_correction_finance_command_access(actor);
    const payload = build_create_manual_correction_payload(input);
    const requestHash = build_create_manual_correction_request_hash(payload);

    const idempotency = await this.acquire_idempotency(
      create_manual_correction_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_manual_correction(idempotency.responseBody, actor);
    }

    try {
      const createdCorrectionId = await this.prismaService.$transaction(
        async (transactionClient) => {
          const createdCorrection = await transactionClient.financeManualCorrection.create({
            data: {
              status: to_prisma_enum<PrismaFinanceCorrectionStatus>("draft"),
              reason: payload.reason,
              requestedByUser: {
                connect: {
                  id: actor.userId
                }
              },
              payload: payload as unknown as Prisma.InputJsonValue
            },
            select: {
              id: true
            }
          });

          await this.emit_manual_correction_event(transactionClient, {
            eventType: "finance.correction_created",
            correctionId: createdCorrection.id,
            actor,
            context,
            payload: {
              correctionId: createdCorrection.id,
              status: "draft",
              reason: payload.reason,
              requestedByUserId: actor.userId
            }
          });

          await transactionClient.systemIdempotencyRecord.update({
            where: { id: idempotency.recordId },
            data: {
              status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
              responseStatusCode: 200,
              responseBody: { correctionId: createdCorrection.id },
              lockedUntil: null
            }
          });

          return createdCorrection.id;
        }
      );

      return this.getManualCorrection(createdCorrectionId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async submitManualCorrectionForApproval(
    correctionId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<ManualCorrectionReadModel> {
    this.assert_manual_correction_finance_command_access(actor);
    return this.transition_manual_correction(correctionId, actor, context, {
      idempotencyScope: submit_manual_correction_idempotency_scope,
      requestHash: build_correction_transition_request_hash(correctionId),
      expectedStatus: "DRAFT",
      nextStatus: "PENDING_APPROVAL",
      eventType: "finance.correction_submitted_for_approval",
      updateData: {
        status: to_prisma_enum<PrismaFinanceCorrectionStatus>("pending_approval")
      },
      responseBody: { correctionId }
    });
  }

  async approveManualCorrection(
    correctionId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<ManualCorrectionReadModel> {
    this.assert_manual_correction_ceo_command_access(actor);
    const approvedAt = new Date();
    return this.transition_manual_correction(correctionId, actor, context, {
      idempotencyScope: approve_manual_correction_idempotency_scope,
      requestHash: build_correction_transition_request_hash(correctionId),
      expectedStatus: "PENDING_APPROVAL",
      nextStatus: "APPROVED",
      eventType: "finance.correction_approved",
      updateData: {
        status: to_prisma_enum<PrismaFinanceCorrectionStatus>("approved"),
        approvedByUser: {
          connect: {
            id: actor.userId
          }
        },
        approvedAt
      },
      responseBody: { correctionId },
      eventPayload: {
        approvedByUserId: actor.userId
      }
    });
  }

  async rejectManualCorrection(
    correctionId: string,
    input: RejectManualCorrectionInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<ManualCorrectionReadModel> {
    this.assert_manual_correction_ceo_command_access(actor);
    const reason = normalize_required_text(input.reason, "reason", 5000);
    const rejectedAt = new Date();
    return this.transition_manual_correction(correctionId, actor, context, {
      idempotencyScope: reject_manual_correction_idempotency_scope,
      requestHash: build_reject_manual_correction_request_hash(correctionId, reason),
      expectedStatus: "PENDING_APPROVAL",
      nextStatus: "REJECTED",
      eventType: "finance.correction_rejected",
      updateData: {
        status: to_prisma_enum<PrismaFinanceCorrectionStatus>("rejected"),
        rejectedAt
      },
      responseBody: { correctionId },
      eventPayload: {
        reason
      }
    });
  }

  async applyManualCorrection(
    correctionId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext
  ): Promise<ManualCorrectionReadModel> {
    this.assert_manual_correction_finance_command_access(actor);
    const requestHash = build_correction_transition_request_hash(correctionId);
    const idempotency = await this.acquire_idempotency(
      apply_manual_correction_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_manual_correction(idempotency.responseBody, actor, correctionId);
    }

    try {
      const appliedCorrectionId = await this.prismaService.$transaction(
        async (transactionClient) => {
          const existing = await transactionClient.financeManualCorrection.findFirst({
            where: {
              id: correctionId
            }
          });

          if (!existing) {
            throw new NotFoundException(`Finance correction '${correctionId}' was not found`);
          }

          if (existing.status !== "APPROVED" || existing.appliedEntryId) {
            throw to_manual_correction_transition_conflict(
              correctionId,
              existing.status,
              "APPROVED"
            );
          }

          const payload = normalize_manual_correction_payload(existing.payload);
          const financeEntry = await transactionClient.financeFinanceEntry.create({
            data: {
              entryType: to_prisma_enum<PrismaFinanceEntryType>("adjustment"),
              ...(payload.relatedOrderId
                ? {
                    order: {
                      connect: {
                        id: payload.relatedOrderId
                      }
                    }
                  }
                : {}),
              amount: payload.amount,
              currency: payload.currency,
              recognizedAt: normalize_datetime(payload.recognizedAt, "recognizedAt"),
              description: payload.description ?? `Manual finance correction: ${payload.reason}`,
              createdByUser: {
                connect: {
                  id: actor.userId
                }
              }
            },
            select: {
              id: true
            }
          });

          try {
            await transactionClient.financeManualCorrection.update({
              where: {
                id: correctionId,
                status: to_prisma_enum<PrismaFinanceCorrectionStatus>("approved"),
                appliedEntry: null
              },
              data: {
                status: to_prisma_enum<PrismaFinanceCorrectionStatus>("applied"),
                appliedAt: new Date(),
                appliedEntry: {
                  connect: {
                    id: financeEntry.id
                  }
                }
              }
            });
          } catch (error) {
            if (is_record_not_found_error(error)) {
              throw to_manual_correction_transition_conflict(correctionId, "APPLIED", "APPROVED");
            }
            throw error;
          }

          await this.emit_manual_correction_event(transactionClient, {
            eventType: "finance.correction_applied",
            correctionId,
            actor,
            context,
            payload: {
              correctionId,
              status: "applied",
              financeEntryId: financeEntry.id
            }
          });

          await transactionClient.systemIdempotencyRecord.update({
            where: { id: idempotency.recordId },
            data: {
              status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
              responseStatusCode: 200,
              responseBody: { correctionId, financeEntryId: financeEntry.id },
              lockedUntil: null
            }
          });

          return correctionId;
        }
      );

      return this.getManualCorrection(appliedCorrectionId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async transition_manual_correction(
    correctionId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: FinanceCommandContext,
    command: {
      idempotencyScope: string;
      requestHash: string;
      expectedStatus: PrismaFinanceCorrectionStatus;
      nextStatus: PrismaFinanceCorrectionStatus;
      eventType: string;
      updateData: Prisma.FinanceManualCorrectionUpdateInput;
      responseBody: Record<string, string>;
      eventPayload?: Record<string, string>;
    }
  ): Promise<ManualCorrectionReadModel> {
    const idempotency = await this.acquire_idempotency(
      command.idempotencyScope,
      context.idempotencyKey,
      command.requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_manual_correction(idempotency.responseBody, actor, correctionId);
    }

    try {
      const updatedCorrectionId = await this.prismaService.$transaction(
        async (transactionClient) => {
          const existing = await transactionClient.financeManualCorrection.findFirst({
            where: {
              id: correctionId
            },
            select: {
              id: true,
              status: true
            }
          });

          if (!existing) {
            throw new NotFoundException(`Finance correction '${correctionId}' was not found`);
          }

          if (existing.status !== command.expectedStatus) {
            throw to_manual_correction_transition_conflict(
              correctionId,
              existing.status,
              command.expectedStatus
            );
          }

          try {
            await transactionClient.financeManualCorrection.update({
              where: {
                id: correctionId,
                status: command.expectedStatus
              },
              data: command.updateData
            });
          } catch (error) {
            if (is_record_not_found_error(error)) {
              throw to_manual_correction_transition_conflict(
                correctionId,
                command.nextStatus,
                command.expectedStatus
              );
            }
            throw error;
          }

          await this.emit_manual_correction_event(transactionClient, {
            eventType: command.eventType,
            correctionId,
            actor,
            context,
            payload: {
              correctionId,
              status: from_prisma_enum(command.nextStatus),
              ...(command.eventPayload ?? {})
            }
          });

          await transactionClient.systemIdempotencyRecord.update({
            where: { id: idempotency.recordId },
            data: {
              status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
              responseStatusCode: 200,
              responseBody: command.responseBody,
              lockedUntil: null
            }
          });

          return correctionId;
        }
      );

      return this.getManualCorrection(updatedCorrectionId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async emit_manual_correction_event(
    transactionClient: Prisma.TransactionClient,
    event: {
      eventType: string;
      correctionId: string;
      actor: Pick<AuthPrincipal, "userId">;
      context: FinanceCommandContext;
      payload: Record<string, unknown>;
    }
  ): Promise<void> {
    const occurredAt = new Date();
    const payload = {
      ...event.payload,
      actorUserId: event.actor.userId,
      occurredAt: occurredAt.toISOString(),
      ...build_manual_correction_event_time_payload(event.eventType, occurredAt)
    };

    await transactionClient.auditLogRecord.create({
      data: {
        eventId: build_manual_correction_audit_event_id(
          event.eventType,
          event.correctionId,
          event.context.idempotencyKey
        ),
        occurredAt,
        action: event.eventType,
        entityType: manual_correction_entity_type,
        entityId: event.correctionId,
        actorUserId: event.actor.userId,
        ...(event.context.requestId ? { requestId: event.context.requestId } : {}),
        ...(event.context.correlationId ? { correlationId: event.context.correlationId } : {}),
        payload: payload as Prisma.InputJsonValue
      }
    });

    await transactionClient.systemOutboxRecord.createMany({
      data: [
        {
          eventType: event.eventType,
          aggregateType: manual_correction_entity_type,
          aggregateId: event.correctionId,
          payload: payload as Prisma.InputJsonValue
        }
      ]
    });
  }

  private async resolve_replayed_manual_correction(
    responseBody: Prisma.JsonValue | null,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    fallbackCorrectionId?: string
  ): Promise<ManualCorrectionReadModel> {
    const correctionId =
      resolve_id_from_response_body(responseBody, "correctionId") ?? fallbackCorrectionId;
    if (!correctionId) {
      throw new ConflictException({
        code: "SOURCE_OF_TRUTH_VIOLATION",
        message: "Idempotency record does not contain finance correction reference"
      });
    }

    return this.getManualCorrection(correctionId, actor);
  }

  private async resolve_replayed_expense(
    responseBody: Prisma.JsonValue | null,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    fallbackExpenseId?: string
  ): Promise<ExpenseReadModel> {
    const expenseId = resolve_id_from_response_body(responseBody, "expenseId") ?? fallbackExpenseId;
    if (!expenseId) {
      throw new ConflictException({
        code: "SOURCE_OF_TRUTH_VIOLATION",
        message: "Idempotency record does not contain expense reference"
      });
    }

    return this.getExpense(expenseId, actor);
  }

  private async resolve_replayed_marketing_expense(
    responseBody: Prisma.JsonValue | null,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    fallbackMarketingExpenseId?: string
  ): Promise<MarketingExpenseReadModel> {
    const marketingExpenseId =
      resolve_id_from_response_body(responseBody, "marketingExpenseId") ??
      fallbackMarketingExpenseId;
    if (!marketingExpenseId) {
      throw new ConflictException({
        code: "SOURCE_OF_TRUTH_VIOLATION",
        message: "Idempotency record does not contain marketing expense reference"
      });
    }

    return this.getMarketingExpense(marketingExpenseId, actor);
  }

  private async acquire_idempotency(
    scope: string,
    idempotencyKey: string,
    requestHash: string,
    canRetryOnConflict = true
  ): Promise<AcquiredIdempotencyRecord> {
    const existingRecord = await this.prismaService.systemIdempotencyRecord.findUnique({
      where: {
        scope_idempotencyKey: {
          scope,
          idempotencyKey
        }
      },
      select: {
        id: true,
        requestHash: true,
        status: true,
        lockedUntil: true,
        responseBody: true
      }
    });

    const now = new Date();
    const lockUntil = new Date(now.getTime() + 5 * 60 * 1000);
    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new ConflictException({
          code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
          message: "Idempotency key is already used with a different command payload"
        });
      }

      if (existingRecord.status === "COMPLETED") {
        return {
          recordId: existingRecord.id,
          replayed: true,
          responseBody: existingRecord.responseBody
        };
      }

      if (
        existingRecord.status === "STARTED" &&
        existingRecord.lockedUntil &&
        existingRecord.lockedUntil > now
      ) {
        throw new ConflictException({
          code: "CONFLICT",
          message: "Command with this Idempotency-Key is already in progress"
        });
      }

      const restarted = await this.prismaService.systemIdempotencyRecord.update({
        where: { id: existingRecord.id },
        data: {
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil,
          responseStatusCode: null,
          responseBody: Prisma.DbNull
        },
        select: {
          id: true
        }
      });

      return {
        recordId: restarted.id,
        replayed: false,
        responseBody: null
      };
    }

    try {
      const created = await this.prismaService.systemIdempotencyRecord.create({
        data: {
          scope,
          idempotencyKey,
          requestHash,
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil
        },
        select: {
          id: true
        }
      });

      return {
        recordId: created.id,
        replayed: false,
        responseBody: null
      };
    } catch (error) {
      if (canRetryOnConflict && is_unique_constraint_error(error)) {
        return this.acquire_idempotency(scope, idempotencyKey, requestHash, false);
      }
      throw error;
    }
  }

  private async mark_idempotency_failed(recordId: string, error: unknown): Promise<void> {
    await this.prismaService.systemIdempotencyRecord.update({
      where: {
        id: recordId
      },
      data: {
        status: to_prisma_enum<PrismaIdempotencyStatus>("failed"),
        responseStatusCode: resolve_error_status_code(error),
        responseBody: {
          message: error instanceof Error ? error.message : "Finance command failed"
        },
        lockedUntil: null
      }
    });
  }

  private async assert_order_exists(orderId: string): Promise<void> {
    const order = await this.prismaService.ordersOrder.findFirst({
      where: {
        id: orderId,
        isDeleted: false
      },
      select: {
        id: true
      }
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found`);
    }
  }

  private assert_finance_access(actor: Pick<AuthPrincipal, "roleCodes">): void {
    const hasAccess = actor.roleCodes.some((roleCode) =>
      finance_allowed_roles.has(roleCode as "finance" | "admin" | "ceo")
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Expenses and marketing-expenses are available only for finance/admin/ceo"
      });
    }
  }

  private assert_manual_correction_read_access(actor: Pick<AuthPrincipal, "roleCodes">): void {
    const hasAccess = actor.roleCodes.some((roleCode) =>
      manual_correction_read_roles.has(roleCode as "finance" | "ceo")
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Finance manual corrections are available only for finance/ceo"
      });
    }
  }

  private assert_manual_correction_finance_command_access(
    actor: Pick<AuthPrincipal, "roleCodes">
  ): void {
    const hasAccess = actor.roleCodes.some((roleCode) =>
      manual_correction_finance_command_roles.has(roleCode as "finance")
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Finance manual correction command is available only for finance"
      });
    }
  }

  private assert_manual_correction_ceo_command_access(
    actor: Pick<AuthPrincipal, "roleCodes">
  ): void {
    const hasAccess = actor.roleCodes.some((roleCode) =>
      manual_correction_ceo_command_roles.has(roleCode as "ceo")
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Finance manual correction approval command is available only for ceo"
      });
    }
  }
}

function map_expense_read_model(record: FinanceExpense): ExpenseReadModel {
  return {
    id: record.id,
    expenseType: from_prisma_enum(record.expenseType) as ExpenseType,
    amount: to_decimal_string(record.amount) ?? "0",
    currency: record.currency,
    occurredAt: to_iso_datetime(record.occurredAt) ?? "",
    description: record.description,
    relatedOrderId: record.relatedOrderId,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_marketing_expense_read_model(
  record: FinanceMarketingExpense
): MarketingExpenseReadModel {
  return {
    id: record.id,
    source: record.source,
    campaign: record.campaign,
    amount: to_decimal_string(record.amount) ?? "0",
    currency: record.currency,
    occurredAt: to_iso_datetime(record.occurredAt) ?? "",
    description: record.description,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_manual_correction_read_model(
  record: FinanceManualCorrection
): ManualCorrectionReadModel {
  return {
    id: record.id,
    status: from_prisma_enum(record.status) as FinanceCorrectionStatus,
    reason: record.reason,
    requestedByUserId: record.requestedByUserId,
    approvedByUserId: record.approvedByUserId,
    approvedAt: to_iso_datetime(record.approvedAt),
    rejectedAt: to_iso_datetime(record.rejectedAt),
    appliedAt: to_iso_datetime(record.appliedAt),
    appliedEntryId: record.appliedEntryId,
    payload: normalize_manual_correction_payload(record.payload),
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function extract_eq_filter(query: ReadCollectionQueryInput, field: string): string | undefined {
  const filters = query.contract.filters ?? [];
  for (const filter of filters) {
    if (filter.field !== field || filter.operator !== "eq") {
      continue;
    }

    if (typeof filter.value !== "string") {
      continue;
    }

    const normalized = filter.value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
}

function normalize_expense_update_input(input: UpdateExpenseInput): NormalizedExpenseUpdateInput {
  const normalized: NormalizedExpenseUpdateInput = {};

  if (input.expenseType !== undefined) {
    normalized.expenseType = input.expenseType;
  }
  if (input.amount !== undefined) {
    normalized.amount = normalize_amount(input.amount);
  }
  if (input.currency !== undefined) {
    normalized.currency = normalize_currency(input.currency);
  }
  if (input.occurredAt !== undefined) {
    normalized.occurredAt = normalize_datetime(input.occurredAt, "occurredAt");
  }
  if (input.description !== undefined) {
    normalized.description = normalize_optional_text(input.description);
  }
  if (input.relatedOrderId !== undefined) {
    normalized.relatedOrderId = input.relatedOrderId;
  }

  return normalized;
}

function build_expense_update_data(
  input: NormalizedExpenseUpdateInput
): Prisma.FinanceExpenseUpdateInput {
  return {
    ...(input.expenseType
      ? { expenseType: to_prisma_enum<PrismaExpenseType>(input.expenseType) }
      : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.relatedOrderId !== undefined
      ? {
          relatedOrder: {
            connect: {
              id: input.relatedOrderId
            }
          }
        }
      : {})
  };
}

function normalize_marketing_expense_update_input(
  input: UpdateMarketingExpenseInput
): NormalizedMarketingExpenseUpdateInput {
  const normalized: NormalizedMarketingExpenseUpdateInput = {};

  if (input.source !== undefined) {
    normalized.source = normalize_required_text(input.source, "source", 128);
  }
  if (input.campaign !== undefined) {
    normalized.campaign = normalize_optional_text(input.campaign);
  }
  if (input.amount !== undefined) {
    normalized.amount = normalize_amount(input.amount);
  }
  if (input.currency !== undefined) {
    normalized.currency = normalize_currency(input.currency);
  }
  if (input.occurredAt !== undefined) {
    normalized.occurredAt = normalize_datetime(input.occurredAt, "occurredAt");
  }
  if (input.description !== undefined) {
    normalized.description = normalize_optional_text(input.description);
  }

  return normalized;
}

function build_marketing_expense_update_data(
  input: NormalizedMarketingExpenseUpdateInput
): Prisma.FinanceMarketingExpenseUpdateInput {
  return {
    ...(input.source !== undefined ? { source: input.source } : {}),
    ...(input.campaign !== undefined ? { campaign: input.campaign } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
    ...(input.description !== undefined ? { description: input.description } : {})
  };
}

function build_create_manual_correction_payload(
  input: CreateManualCorrectionInput
): ManualCorrectionPayload {
  const recognizedAt = normalize_datetime(input.recognizedAt, "recognizedAt");
  const reason = normalize_required_text(input.reason, "reason", 5000);

  return {
    amount: normalize_amount(input.amount),
    currency: normalize_currency(input.currency),
    recognizedAt: recognizedAt.toISOString(),
    reason,
    description: normalize_optional_text(input.description),
    relatedOrderId: normalize_optional_text(input.relatedOrderId),
    reconciliationReference: normalize_manual_correction_reconciliation_reference(
      input.reconciliationReference
    )
  };
}

function normalize_manual_correction_payload(payload: Prisma.JsonValue): ManualCorrectionPayload {
  if (!is_json_record(payload)) {
    throw new ConflictException({
      code: "SOURCE_OF_TRUTH_VIOLATION",
      message: "Finance manual correction payload is invalid"
    });
  }

  return {
    amount: read_required_json_string(payload, "amount"),
    currency: read_required_json_string(payload, "currency"),
    recognizedAt: read_required_json_string(payload, "recognizedAt"),
    reason: read_required_json_string(payload, "reason"),
    description: read_optional_json_string(payload, "description"),
    relatedOrderId: read_optional_json_string(payload, "relatedOrderId"),
    reconciliationReference: normalize_manual_correction_reconciliation_reference(
      read_optional_json_record(payload, "reconciliationReference")
    )
  };
}

function normalize_manual_correction_reconciliation_reference(
  value: Record<string, unknown> | null | undefined
): ManualCorrectionReconciliationReference | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!is_json_record(value)) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "reconciliationReference must be an object"
    });
  }

  return {
    reportId: read_required_input_string(
      value,
      "reconciliationReference.reportId",
      "reportId",
      128
    ),
    pair: read_required_input_string(value, "reconciliationReference.pair", "pair", 128),
    leftEntityRef: read_required_input_string(
      value,
      "reconciliationReference.leftEntityRef",
      "leftEntityRef",
      255
    ),
    rightEntityRef: read_required_input_string(
      value,
      "reconciliationReference.rightEntityRef",
      "rightEntityRef",
      255
    ),
    recommendedAction: read_required_input_string(
      value,
      "reconciliationReference.recommendedAction",
      "recommendedAction",
      255
    )
  };
}

function build_create_manual_correction_request_hash(payload: ManualCorrectionPayload): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function build_correction_transition_request_hash(correctionId: string): string {
  return createHash("sha256").update(JSON.stringify({ correctionId })).digest("hex");
}

function build_reject_manual_correction_request_hash(correctionId: string, reason: string): string {
  return createHash("sha256").update(JSON.stringify({ correctionId, reason })).digest("hex");
}

function build_manual_correction_audit_event_id(
  eventType: string,
  correctionId: string,
  idempotencyKey: string
): string {
  const keyHash = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 16);
  return `${eventType}:${correctionId}:${keyHash}`;
}

function build_manual_correction_event_time_payload(
  eventType: string,
  occurredAt: Date
): Record<string, string> {
  const occurredAtIso = occurredAt.toISOString();
  if (eventType === "finance.correction_created") {
    return { createdAt: occurredAtIso };
  }
  if (eventType === "finance.correction_submitted_for_approval") {
    return { submittedAt: occurredAtIso };
  }
  if (eventType === "finance.correction_approved") {
    return { approvedAt: occurredAtIso };
  }
  if (eventType === "finance.correction_rejected") {
    return { rejectedAt: occurredAtIso };
  }
  if (eventType === "finance.correction_applied") {
    return { appliedAt: occurredAtIso };
  }

  return {};
}

function to_manual_correction_transition_conflict(
  correctionId: string,
  actualStatus: string,
  expectedStatus: string
): ConflictException {
  return new ConflictException({
    code: "STATE_TRANSITION_NOT_ALLOWED",
    message: `Finance correction '${correctionId}' must be ${from_prisma_enum(
      expectedStatus
    )} before this command; current status is ${from_prisma_enum(actualStatus)}`
  });
}

function build_create_expense_request_hash(input: {
  expenseType: ExpenseType;
  amount: string;
  currency: string;
  occurredAt: string;
  description: string | null;
  relatedOrderId: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function build_update_expense_request_hash(
  expenseId: string,
  input: NormalizedExpenseUpdateInput
): string {
  const serialized = {
    expenseId,
    ...(input.expenseType !== undefined ? { expenseType: input.expenseType } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt.toISOString() } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.relatedOrderId !== undefined ? { relatedOrderId: input.relatedOrderId } : {})
  };

  return createHash("sha256").update(JSON.stringify(serialized)).digest("hex");
}

function build_create_marketing_expense_request_hash(input: {
  source: string;
  campaign: string | null;
  amount: string;
  currency: string;
  occurredAt: string;
  description: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function build_update_marketing_expense_request_hash(
  marketingExpenseId: string,
  input: NormalizedMarketingExpenseUpdateInput
): string {
  const serialized = {
    marketingExpenseId,
    ...(input.source !== undefined ? { source: input.source } : {}),
    ...(input.campaign !== undefined ? { campaign: input.campaign } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt.toISOString() } : {}),
    ...(input.description !== undefined ? { description: input.description } : {})
  };

  return createHash("sha256").update(JSON.stringify(serialized)).digest("hex");
}

function resolve_id_from_response_body(
  payload: Prisma.JsonValue | null,
  key: string
): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const raw = (payload as Record<string, unknown>)[key];
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

function is_json_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function read_required_json_string(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ConflictException({
      code: "SOURCE_OF_TRUTH_VIOLATION",
      message: `Finance manual correction payload is missing '${key}'`
    });
  }

  return value.trim();
}

function read_optional_json_string(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ConflictException({
      code: "SOURCE_OF_TRUTH_VIOLATION",
      message: `Finance manual correction payload field '${key}' must be a string`
    });
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function read_optional_json_record(
  payload: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const value = payload[key];
  if (value === undefined || value === null) {
    return null;
  }

  if (!is_json_record(value)) {
    throw new ConflictException({
      code: "SOURCE_OF_TRUTH_VIOLATION",
      message: `Finance manual correction payload field '${key}' must be an object`
    });
  }

  return value;
}

function read_required_input_string(
  payload: Record<string, unknown>,
  field: string,
  key: string,
  maxLength: number
): string {
  const value = payload[key];
  if (typeof value !== "string") {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} is required`
    });
  }

  return normalize_required_text(value, field, maxLength);
}

function normalize_amount(rawAmount: string): string {
  const normalized = rawAmount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "amount must be a positive decimal with up to 2 fraction digits"
    });
  }

  const amountValue = Number(normalized);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "amount must be greater than zero"
    });
  }

  return amountValue.toFixed(2);
}

function normalize_currency(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "RUB";
  }

  const normalized = value.trim().toUpperCase();
  if (normalized !== "RUB") {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Only RUB currency is supported in v1 baseline"
    });
  }

  return normalized;
}

function normalize_datetime(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} must be a valid ISO datetime`
    });
  }

  return parsed;
}

function normalize_optional_text(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalize_required_text(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} is required`
    });
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} length must be <= ${maxLength}`
    });
  }

  return normalized;
}

function resolve_error_status_code(error: unknown): number {
  if (error instanceof NotFoundException) {
    return 404;
  }

  if (error instanceof ConflictException) {
    return 409;
  }

  if (error instanceof BadRequestException) {
    return 422;
  }

  return 500;
}

function is_unique_constraint_error(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "P2002";
}

function is_record_not_found_error(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "P2025";
}
