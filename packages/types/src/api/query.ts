export type QueryScalar = string | number | boolean | null;

export type SortDirection = "asc" | "desc";

export interface SortClause {
  field: string;
  direction: SortDirection;
}

export type FilterOperator =
  | "eq"
  | "ne"
  | "in"
  | "nin"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "between"
  | "is_null";

export interface FilterClause {
  field: string;
  operator: FilterOperator;
  value?: QueryScalar | QueryScalar[];
  from?: QueryScalar;
  to?: QueryScalar;
}

export interface PagePaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface CursorPaginationQuery {
  cursor?: string;
  limit?: number;
}

export type PaginationMode = "page" | "cursor";

export interface PaginationQuery {
  mode?: PaginationMode;
  page?: PagePaginationQuery;
  cursor?: CursorPaginationQuery;
}

export interface QueryPeriod {
  from?: string;
  to?: string;
  timezone?: string;
}

export interface CollectionQueryContract {
  search?: string;
  pagination?: PaginationQuery;
  sort?: SortClause[];
  filters?: FilterClause[];
  period?: QueryPeriod;
}

export interface PagePaginationMeta {
  page: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
}

export interface CursorPaginationMeta {
  nextCursor?: string;
  previousCursor?: string;
  limit?: number;
}

export interface PaginationMeta {
  mode: PaginationMode;
  page?: PagePaginationMeta;
  cursor?: CursorPaginationMeta;
}

