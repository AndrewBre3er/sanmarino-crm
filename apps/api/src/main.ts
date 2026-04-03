import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import {
  api_openapi_contract,
  api_openapi_extensions,
  api_openapi_tags
} from "./contracts/openapi.contract";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(api_openapi_contract.globalPrefix);

  const swagger = new DocumentBuilder()
    .setTitle(api_openapi_contract.title)
    .setDescription(api_openapi_contract.description)
    .setVersion(api_openapi_contract.version)
    .addTag(api_openapi_tags.health.name, api_openapi_tags.health.description)
    .addExtension(
      "x-platform-contracts-package",
      api_openapi_extensions.platformContractsPackage
    )
    .addExtension("x-bootstrap-phase", api_openapi_extensions.bootstrapPhase)
    .addExtension("x-declared-error-codes", api_openapi_extensions.declaredErrorCodes)
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup(api_openapi_contract.docsPath, app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST ?? "0.0.0.0";

  await app.listen(port, host);
}

void bootstrap();
