import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from "class-validator";
import {
  deal_statuses,
  delivery_task_statuses,
  lead_statuses,
  order_statuses,
  payment_statuses,
  return_request_statuses,
  type DealStatus,
  type DeliveryTaskStatus,
  type LeadStatus,
  type OrderStatus,
  type PaymentStatus,
  type ReturnRequestStatus
} from "../../transactional/shared/status.contract";
import type {
  CollectionQueryContract,
  FilterClause,
  PagePaginationMeta,
  ReadCollectionQueryInput,
  SortClause,
  SortDirection
} from "./read-model.contract";

const read_query_defaults = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100
} as const;

function trim_to_undefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function to_string_array(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const flattened = value
      .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return flattened.length > 0 ? flattened : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed.length > 0 ? parsed : undefined;
}

function normalize_boolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

function to_status_filters(status_field: string, statuses: string[]): FilterClause[] {
  if (statuses.length === 0) {
    return [];
  }

  const [single_status] = statuses;
  if (statuses.length === 1 && single_status) {
    return [
      {
        field: status_field,
        operator: "eq",
        value: single_status
      }
    ];
  }

  return [
    {
      field: status_field,
      operator: "in",
      value: statuses
    }
  ];
}

export class BaseReadCollectionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(read_query_defaults.maxPageSize)
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsString()
  @MaxLength(128)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsString()
  @MaxLength(64)
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsIn(["asc", "desc"])
  sortDirection?: SortDirection;

  @IsOptional()
  @Transform(({ value }) => normalize_boolean(value))
  @IsBoolean()
  includeDeleted?: boolean;
}

export class LeadsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(lead_statuses, { each: true })
  status?: LeadStatus[];

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsUUID()
  responsibleUserId?: string;
}

export class DealsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(deal_statuses, { each: true })
  status?: DealStatus[];

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsUUID()
  responsibleUserId?: string;
}

export class OrdersReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(order_statuses, { each: true })
  status?: OrderStatus[];
}

export class PaymentsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(payment_statuses, { each: true })
  status?: PaymentStatus[];
}

export class DeliveryTasksReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(delivery_task_statuses, { each: true })
  status?: DeliveryTaskStatus[];
}

export class ReturnRequestsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => to_string_array(value))
  @IsArray()
  @IsIn(return_request_statuses, { each: true })
  status?: ReturnRequestStatus[];
}

export interface BuildReadCollectionQueryOptions {
  defaultSortField: string;
  allowedSortFields: readonly string[];
  statusField?: string;
  statusValues?: readonly string[] | undefined;
}

export function build_read_collection_query(
  dto: BaseReadCollectionQueryDto,
  options: BuildReadCollectionQueryOptions
): ReadCollectionQueryInput {
  const page = dto.page ?? read_query_defaults.page;
  const pageSize = dto.pageSize ?? read_query_defaults.pageSize;
  const search = trim_to_undefined(dto.search);
  const requestedSortField = trim_to_undefined(dto.sortBy);
  const sortField =
    requestedSortField && options.allowedSortFields.includes(requestedSortField)
      ? requestedSortField
      : options.defaultSortField;
  const sortDirection: SortDirection = dto.sortDirection ?? "desc";
  const includeDeleted = dto.includeDeleted ?? false;

  const statuses = options.statusValues ? [...options.statusValues] : [];
  const filters = options.statusField ? to_status_filters(options.statusField, statuses) : [];
  const sort: SortClause[] = [{ field: sortField, direction: sortDirection }];

  const contract: CollectionQueryContract = {
    ...(search ? { search } : {}),
    pagination: {
      mode: "page",
      page: {
        page,
        pageSize
      }
    },
    ...(sort.length > 0 ? { sort } : {}),
    ...(filters.length > 0 ? { filters } : {})
  };

  return {
    page,
    pageSize,
    includeDeleted,
    ...(search ? { search } : {}),
    ...(statuses.length > 0 ? { status: statuses } : {}),
    sortField,
    sortDirection,
    contract
  };
}

export function build_page_pagination_meta(
  total_items: number,
  page: number,
  page_size: number
): PagePaginationMeta {
  const total_pages = total_items === 0 ? 0 : Math.ceil(total_items / page_size);

  return {
    page,
    pageSize: page_size,
    totalItems: total_items,
    totalPages: total_pages
  };
}
