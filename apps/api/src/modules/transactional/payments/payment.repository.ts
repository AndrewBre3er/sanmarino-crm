import type {
  PersistenceListQuery,
  PersistenceRecordBase,
  RepositoryBaseContract,
  RepositoryFindOptions,
  RepositorySoftDeleteOptions,
  RepositoryUpdateOptions,
  TransactionContext
} from "../../../common/persistence";
import type { PrismaService } from "../../../prisma/prisma.service";
import { throw_deferred_skeleton } from "../shared/deferred-skeleton.error";
import type { PaymentMethod, PaymentStatus } from "../shared/status.contract";

export interface PaymentsPaymentRecord extends PersistenceRecordBase {
  paymentNumber: string;
  orderId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  amount: string;
  refundedAmount: string;
  receivedAt?: string | null;
  externalReference?: string | null;
  createdBy: string;
}

export interface PaymentsPaymentCreateInput {
  paymentNumber: string;
  orderId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  amount: string;
  createdBy: string;
  refundedAmount?: string;
  receivedAt?: string | null;
  externalReference?: string | null;
}

export interface PaymentsPaymentUpdateInput {
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amount?: string;
  refundedAmount?: string;
  receivedAt?: string | null;
  externalReference?: string | null;
}

export interface PaymentsPaymentRepositoryContract
  extends RepositoryBaseContract<
    PaymentsPaymentRecord,
    PaymentsPaymentCreateInput,
    PaymentsPaymentUpdateInput
  > {
  withTransaction(context: TransactionContext): PaymentsPaymentRepositoryContract;
}

export class PrismaPaymentsPaymentRepository implements PaymentsPaymentRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): PaymentsPaymentRepositoryContract {
    return new PrismaPaymentsPaymentRepository(this.prismaService, context);
  }

  async findById(
    id: string,
    options?: RepositoryFindOptions
  ): Promise<PaymentsPaymentRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaPaymentsPaymentRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: PaymentsPaymentRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaPaymentsPaymentRepository", "list");
  }

  async create(
    input: PaymentsPaymentCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<PaymentsPaymentRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaPaymentsPaymentRepository", "create");
  }

  async updateById(
    id: string,
    input: PaymentsPaymentUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<PaymentsPaymentRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaPaymentsPaymentRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaPaymentsPaymentRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaPaymentsPaymentRepository", "restoreById");
  }

  private touch_context(id: string): void {
    const client = this.transactionContext?.client ?? this.prismaService;
    void client;
    void id;
  }
}
