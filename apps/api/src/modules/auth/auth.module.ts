import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthPrismaAccountsService } from "./auth.prisma-accounts";
import { AuthLoginRateLimitService } from "./auth.rate-limit";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthPrismaAccountsService, AuthLoginRateLimitService, AuthService]
})
export class AuthModule {}
