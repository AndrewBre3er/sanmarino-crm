import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { ApiExceptionFilter } from "./common/errors/api-exception.filter";
import { ApiResponseEnvelopeInterceptor } from "./common/http/api-response-envelope.interceptor";
import { RequestContextMiddleware } from "./common/request-context/request-context.middleware";
import { RequestContextPropagationInterceptor } from "./common/request-context/request-context.propagation.interceptor";
import { RequestContextStore } from "./common/request-context/request-context.store";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { TransactionalReadModule } from "./modules/read-side/read-side.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, TransactionalReadModule],
  providers: [
    RequestContextStore,
    RequestContextPropagationInterceptor,
    ApiResponseEnvelopeInterceptor,
    ApiExceptionFilter
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({
      method: RequestMethod.ALL,
      path: "*"
    });
  }
}
