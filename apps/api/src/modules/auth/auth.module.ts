import { Module } from "@nestjs/common";
import { AuthAccessGuard } from "./auth.access.guard";
import { AuthController } from "./auth.controller";
import { AuthPrismaAccountsService } from "./auth.prisma-accounts";
import { AuthLoginRateLimitService } from "./auth.rate-limit";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthPrismaAccountsService, AuthLoginRateLimitService, AuthService, AuthAccessGuard]
})
export class AuthModule {}
