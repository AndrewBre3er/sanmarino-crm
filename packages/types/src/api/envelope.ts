import type { ApiError } from "./error.js";
import type { FilterClause, PaginationMeta, SortClause } from "./query.js";

export interface ApiWarning {
  code: string;
  message: string;
}

export interface ApiResponseMeta {
  requestId?: string;
  correlationId?: string;
  timestamp?: string;
  pagination?: PaginationMeta;
  appliedFilters?: FilterClause[];
  appliedSort?: SortClause[];
  warnings?: ApiWarning[];
  version?: string;
}

export interface ApiSuccessEnvelope<
  TData = unknown,
  TMeta extends ApiResponseMeta = ApiResponseMeta
> {
  data: TData;
  meta?: TMeta;
}

export interface ApiErrorEnvelope<
  TDetails = unknown,
  TMeta extends ApiResponseMeta = ApiResponseMeta
> {
  error: ApiError<TDetails>;
  meta?: TMeta;
}

export type ApiResponseEnvelope<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ApiResponseMeta = ApiResponseMeta
> = ApiSuccessEnvelope<TData, TMeta> | ApiErrorEnvelope<TDetails, TMeta>;
