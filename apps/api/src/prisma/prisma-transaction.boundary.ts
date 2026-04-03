import { Injectable } from "@nestjs/common";
import type {
  TransactionBoundaryContract,
  TransactionBoundaryOptions,
  TransactionCallback,
  TransactionContext
} from "../common/persistence";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaTransactionBoundary implements TransactionBoundaryContract {
  private static readonly providerToken = PrismaService;

  constructor(private readonly prismaService: PrismaService) {}

  async runInTransaction<TResult>(
    callback: TransactionCallback<TResult>,
    options?: TransactionBoundaryOptions
  ): Promise<TResult> {
    void options;
    void PrismaTransactionBoundary.providerToken;

    const context: TransactionContext = {
      provider: "prisma",
      client: this.prismaService.get_transaction_client()
    };

    // TODO: replace direct callback execution with PrismaClient.$transaction binding.
    return callback(context);
  }
}
