import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsString } from "class-validator";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import { UsersAdminService } from "./users.service";

class PatchUserRolesDto {
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  roleCodes!: string[];
}

@ApiTags(api_openapi_tags.auth.name)
@UseGuards(AuthAccessGuard)
@require_roles("admin")
@Controller()
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get("users")
  async listUsers() {
    const users = await this.usersAdminService.listUsers();
    return { data: users };
  }

  @Get("users/:id")
  async getUser(@Param("id") userId: string) {
    const user = await this.usersAdminService.getUser(userId);
    return { data: user };
  }

  @Patch("users/:id/roles")
  async patchUserRoles(
    @Param("id") userId: string,
    @Body() payload: PatchUserRolesDto
  ) {
    const user = await this.usersAdminService.replaceUserRoles(userId, payload.roleCodes);
    return { data: user };
  }

  @Get("roles")
  async listRoles() {
    const roles = await this.usersAdminService.listRoles();
    return { data: roles };
  }

  @Get("permissions")
  async listPermissions() {
    const permissions = await this.usersAdminService.listPermissions();
    return { data: permissions };
  }
}
