import type { ApiEnvelopeMeta } from "../../types/read-api";

export interface StatusSummaryItem {
  status: string;
  count: number;
}

function compare_summary_items(left: StatusSummaryItem, right: StatusSummaryItem): number {
  if (left.count !== right.count) {
    return right.count - left.count;
  }

  return left.status.localeCompare(right.status);
}

export function build_status_summary<TItem>(
  items: readonly TItem[],
  resolve_status: (item: TItem) => string | undefined
): StatusSummaryItem[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const status = resolve_status(item);
    if (!status) {
      continue;
    }

    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort(compare_summary_items);
}

export function format_list_meta_caption(meta?: ApiEnvelopeMeta): string {
  if (!meta?.pagination?.page) {
    return "Read-only query context is available after first successful response.";
  }

  const pagination = meta.pagination.page;
  const total_items =
    typeof pagination.totalItems === "number" ? pagination.totalItems : "unknown";
  const total_pages =
    typeof pagination.totalPages === "number" ? pagination.totalPages : "unknown";

  return `Page ${pagination.page} / ${total_pages}, page size ${pagination.pageSize}, total ${total_items}`;
}

export function format_optional(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return value.trim().length > 0 ? value : "-";
}

export function format_datetime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU");
}

