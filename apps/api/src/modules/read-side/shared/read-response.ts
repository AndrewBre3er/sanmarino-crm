import type { ReadCollectionResult } from "./read-model.contract";

export function to_read_collection_response<TItem>(result: ReadCollectionResult<TItem>) {
  return {
    data: result.items,
    meta: {
      pagination: {
        mode: "page" as const,
        page: result.pagination
      },
      ...(result.appliedFilters && result.appliedFilters.length > 0
        ? { appliedFilters: result.appliedFilters }
        : {}),
      ...(result.appliedSort && result.appliedSort.length > 0
        ? { appliedSort: result.appliedSort }
        : {})
    }
  };
}

