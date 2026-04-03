import { Global, Module } from "@nestjs/common";
import { PrismaTransactionBoundary } from "./prisma-transaction.boundary";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, PrismaTransactionBoundary],
  exports: [PrismaService, PrismaTransactionBoundary]
})
export class PrismaModule {}
