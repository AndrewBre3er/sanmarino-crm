import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import type { ApiShellRequestContext } from "./request-context.types";

@Injectable()
export class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<ApiShellRequestContext>();

  run<T>(context: ApiShellRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): ApiShellRequestContext | undefined {
    return this.storage.getStore();
  }
}

