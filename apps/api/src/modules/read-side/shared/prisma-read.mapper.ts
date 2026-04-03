type DateLike = Date | null | undefined;
type DecimalLike = { toString: () => string } | number | string | null | undefined;

export function to_iso_datetime(value: DateLike): string | null {
  return value ? value.toISOString() : null;
}

export function to_decimal_string(value: DecimalLike): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return value.toString();
}

export function from_prisma_enum(value: string): string {
  return value.toLowerCase();
}

export function to_prisma_enum<TPrismaEnum extends string>(value: string): TPrismaEnum {
  return value.toUpperCase() as TPrismaEnum;
}

