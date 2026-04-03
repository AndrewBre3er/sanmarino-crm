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

export interface PagePaginationMeta {
  page: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
}

export interface CollectionQueryContract {
  search?: string;
  pagination?: {
    mode?: "page" | "cursor";
    page?: {
      page?: number;
      pageSize?: number;
    };
    cursor?: {
      cursor?: string;
      limit?: number;
    };
  };
  sort?: SortClause[];
  filters?: FilterClause[];
  period?: {
    from?: string;
    to?: string;
    timezone?: string;
  };
}

export interface ReadCollectionQueryInput {
  page: number;
  pageSize: number;
  includeDeleted: boolean;
  search?: string;
  status?: string[];
  sortField: string;
  sortDirection: SortDirection;
  contract: CollectionQueryContract;
}

export interface ReadCollectionResult<TItem> {
  items: TItem[];
  pagination: PagePaginationMeta;
  appliedFilters?: FilterClause[];
  appliedSort?: SortClause[];
}
