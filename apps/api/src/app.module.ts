import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { ApiExceptionFilter } from "./common/errors/api-exception.filter";
import { ApiResponseEnvelopeInterceptor } from "./common/http/api-response-envelope.interceptor";
import { RequestContextMiddleware } from "./common/request-context/request-context.middleware";
import { RequestContextPropagationInterceptor } from "./common/request-context/request-context.propagation.interceptor";
import { RequestContextStore } from "./common/request-context/request-context.store";
import { AnalyticsModule } from "./modules/analytics";
import { CrmRelationsModule } from "./modules/crm-relations/crm-relations.module";
import { AuthModule } from "./modules/auth/auth.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { HealthModule } from "./modules/health/health.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { LogisticsModule } from "./modules/logistics/logistics.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ReconciliationModule } from "./modules/reconciliation/reconciliation.module";
import { TransactionalReadModule } from "./modules/read-side/read-side.module";
import { SupplyModule } from "./modules/supply/supply.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    AnalyticsModule,
    UsersModule,
    LeadsModule,
    OrdersModule,
    PaymentsModule,
    ReconciliationModule,
    FinanceModule,
    LogisticsModule,
    CrmRelationsModule,
    TransactionalReadModule,
    SupplyModule
  ],
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
