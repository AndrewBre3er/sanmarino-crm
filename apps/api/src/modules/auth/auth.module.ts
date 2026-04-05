import { Module } from "@nestjs/common";
import { AuthBootstrapAccountsService } from "./auth.bootstrap-accounts";
import { AuthController } from "./auth.controller";
import { AuthLoginRateLimitService } from "./auth.rate-limit";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthBootstrapAccountsService, AuthLoginRateLimitService, AuthService]
})
export class AuthModule {}
