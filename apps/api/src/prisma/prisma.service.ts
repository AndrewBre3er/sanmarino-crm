import { Injectable } from "@nestjs/common";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    // TODO(bootstrap): wire PrismaClient connection after schema implementation phase.
  }

  async onModuleDestroy(): Promise<void> {
    // TODO(bootstrap): wire PrismaClient disconnection after schema implementation phase.
  }
}
