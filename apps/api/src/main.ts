import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/errors/api-exception.filter";
import { http_shell_validation_conventions } from "./common/http/http-shell.conventions";
import { ApiResponseEnvelopeInterceptor } from "./common/http/api-response-envelope.interceptor";
import { RequestContextPropagationInterceptor } from "./common/request-context/request-context.propagation.interceptor";
import {
  api_openapi_contract,
  api_openapi_extensions,
  api_openapi_tags
} from "./contracts/openapi.contract";
import { get_env } from "./config/env";

function resolve_cors_origin(value: string): string | string[] {
  const origins = value
    .split(",")
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  if (origins.length === 0) {
    return "http://localhost:3000";
  }

  return origins.length === 1 ? origins[0] ?? "http://localhost:3000" : origins;
}

async function bootstrap(): Promise<void> {
  const env = get_env();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: resolve_cors_origin(env.API_CORS_ORIGIN),
    credentials: true
  });

  app.setGlobalPrefix(api_openapi_contract.globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe(http_shell_validation_conventions)
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    app.get(RequestContextPropagationInterceptor),
    app.get(ApiResponseEnvelopeInterceptor)
  );

  app.useGlobalFilters(app.get(ApiExceptionFilter));

  const swagger = new DocumentBuilder()
    .setTitle(api_openapi_contract.title)
    .setDescription(api_openapi_contract.description)
    .setVersion(api_openapi_contract.version)
    .addTag(api_openapi_tags.health.name, api_openapi_tags.health.description)
    .addTag(api_openapi_tags.infra.name, api_openapi_tags.infra.description)
    .addTag(api_openapi_tags.crmRead.name, api_openapi_tags.crmRead.description)
    .addTag(api_openapi_tags.crmLeads.name, api_openapi_tags.crmLeads.description)
    .addTag(api_openapi_tags.crmRelations.name, api_openapi_tags.crmRelations.description)
    .addTag(api_openapi_tags.ordersRead.name, api_openapi_tags.ordersRead.description)
    .addTag(api_openapi_tags.paymentsRead.name, api_openapi_tags.paymentsRead.description)
    .addTag(api_openapi_tags.logisticsRead.name, api_openapi_tags.logisticsRead.description)
    .addTag(api_openapi_tags.returnsRead.name, api_openapi_tags.returnsRead.description)
    .addTag(api_openapi_tags.auth.name, api_openapi_tags.auth.description)
    .addExtension(
      "x-platform-contracts-package",
      api_openapi_extensions.platformContractsPackage
    )
    .addExtension("x-bootstrap-phase", api_openapi_extensions.bootstrapPhase)
    .addExtension("x-declared-error-codes", api_openapi_extensions.declaredErrorCodes)
    .addExtension(
      "x-request-context-headers",
      api_openapi_extensions.requestContextHeaders
    )
    .addExtension(
      "x-idempotency-header-contract",
      api_openapi_extensions.idempotencyHeaderContract
    )
    .addExtension("x-audit-boundary-note", api_openapi_extensions.auditBoundaryNote)
    .addExtension("x-read-boundary-note", api_openapi_extensions.readBoundaryNote)
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup(api_openapi_contract.docsPath, app, document);

  await app.listen(env.API_PORT, env.API_HOST);
}

void bootstrap();
