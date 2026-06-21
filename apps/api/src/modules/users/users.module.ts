import { Module } from "@nestjs/common";
import { UsersAdminController } from "./users.controller";
import { PrismaUsersAdminRepository } from "./users.repository";
import { UsersAdminService } from "./users.service";

@Module({
  controllers: [UsersAdminController],
  providers: [PrismaUsersAdminRepository, UsersAdminService]
})
export class UsersModule {}