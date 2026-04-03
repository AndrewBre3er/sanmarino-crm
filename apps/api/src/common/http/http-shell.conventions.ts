export const http_shell_validation_conventions = {
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  validationError: { target: false, value: false }
} as const;

export const http_shell_serialization_conventions = {
  classSerializerInterceptor: true
} as const;

export const http_shell_deferred_todos = {
  dtoValidationRules: "TODO",
  domainSerializationPolicies: "TODO"
} as const;

