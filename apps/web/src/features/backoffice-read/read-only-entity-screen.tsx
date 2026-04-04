"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { LoadingState } from "../../components/states/loading-state";
import { PageHeader, PageSection, PageShell } from "../../components/shell/page-shell";
import { StatusBadge } from "../../components/ui/status-badge";
import { use_read_collection, use_read_detail } from "../../hooks/read-side/use-read-api";
import type { ApiSuccessEnvelope, ReadEntityQuery } from "../../types/read-api";
import type { WorkspaceCode } from "../../contracts/backoffice-shell.contract";
import {
  build_status_summary,
  format_list_meta_caption
} from "./read-only-entity.helpers";

export interface ReadOnlyColumn<TItem> {
  key: string;
  header: string;
  render: (item: TItem) => React.ReactNode;
}

export interface ReadOnlyDetailField<TItem> {
  key: string;
  label: string;
  render: (item: TItem) => React.ReactNode;
}

interface ReadOnlyEntityScreenProps<TListItem extends { id: string }, TDetailItem> {
  title: string;
  subtitle: string;
  workspace: WorkspaceCode;
  query?: ReadEntityQuery;
  fetchCollection: (query: ReadEntityQuery) => Promise<ApiSuccessEnvelope<TListItem[]>>;
  fetchDetail: (entity_id: string) => Promise<ApiSuccessEnvelope<TDetailItem>>;
  columns: readonly ReadOnlyColumn<TListItem>[];
  detailFields: readonly ReadOnlyDetailField<TDetailItem>[];
  getStatus?: (item: TListItem) => string | undefined;
  renderDetailExtras?: (item: TDetailItem) => React.ReactNode;
}

const DEFAULT_QUERY: ReadEntityQuery = {
  page: 1,
  pageSize: 20,
  sortDirection: "desc"
};

export function ReadOnlyEntityScreen<TListItem extends { id: string }, TDetailItem>({
  title,
  subtitle,
  workspace,
  query,
  fetchCollection,
  fetchDetail,
  columns,
  detailFields,
  getStatus,
  renderDetailExtras
}: ReadOnlyEntityScreenProps<TListItem, TDetailItem>) {
  const active_query = query ?? DEFAULT_QUERY;
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const collection = use_read_collection(fetchCollection, active_query);
  const detail = use_read_detail(fetchDetail, selectedId);

  useEffect(() => {
    if (collection.items.length === 0) {
      setSelectedId(undefined);
      return;
    }

    const selected_exists = selectedId
      ? collection.items.some(item => item.id === selectedId)
      : false;

    if (!selectedId || !selected_exists) {
      setSelectedId(collection.items[0]?.id);
    }
  }, [collection.items, selectedId]);

  const summary = useMemo(() => {
    if (!getStatus) {
      return [];
    }

    return build_status_summary(collection.items, getStatus);
  }, [collection.items, getStatus]);

  const selected_detail = detail.item;

  return (
    <PageShell>
      <PageHeader
        title={title}
        subtitle={subtitle}
        note={[
          `Workspace context: ${workspace}.`,
          "Read-only API wiring is active.",
          "TODO: mutations, workflow transitions, auth flow, and RBAC enforcement are intentionally deferred."
        ].join(" ")}
      />

      <PageSection
        title="Query State"
        description="Read-only query metadata from backend response envelope"
      >
        <p className="bo-muted">{format_list_meta_caption(collection.meta)}</p>
      </PageSection>

      <PageSection title="Status Summary" description="Current statuses from list response">
        {collection.isLoading ? (
          <LoadingState label={`Loading ${title.toLowerCase()} summary...`} />
        ) : collection.errorMessage ? (
          <ErrorState title="Summary unavailable" message={collection.errorMessage} />
        ) : summary.length === 0 ? (
          <EmptyState
            title="No status summary yet"
            description="Status distribution appears once records are available."
          />
        ) : (
          <div className="bo-badge-row">
            {summary.map(item => (
              <span key={item.status} className="bo-badge-with-count">
                <StatusBadge label={item.status} />
                <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title="Read-Only List" description={`Entity collection: ${title}`}>
        {collection.isLoading ? (
          <LoadingState label={`Loading ${title.toLowerCase()}...`} />
        ) : collection.errorMessage ? (
          <ErrorState title={`Failed to load ${title.toLowerCase()}`} message={collection.errorMessage} />
        ) : collection.isEmpty ? (
          <EmptyState
            title={`No ${title.toLowerCase()} found`}
            description="The read-side endpoint returned an empty collection for current query parameters."
          />
        ) : (
          <div className="bo-data-table-wrap">
            <table className="bo-data-table">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th key={column.key} scope="col">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collection.items.map(item => {
                  const isSelected = item.id === selectedId;

                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? "bo-data-row-active" : undefined}
                      onClick={() => setSelectedId(item.id)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={isSelected}
                    >
                      {columns.map(column => (
                        <td key={`${item.id}:${column.key}`}>{column.render(item)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection title="Detail Panel (Read-Only)" description="Detail-ready structure for selected list row">
        {!selectedId ? (
          <EmptyState
            title="Select a row"
            description="Choose any record in the list to inspect read-only detail data."
          />
        ) : detail.isLoading ? (
          <LoadingState label="Loading detail..." />
        ) : detail.errorMessage ? (
          <ErrorState title="Detail is unavailable" message={detail.errorMessage} />
        ) : !selected_detail ? (
          <EmptyState
            title="Detail not available"
            description="Selected record does not have detail payload in the current response."
          />
        ) : (
          <div className="bo-detail-panel">
            <dl className="bo-detail-grid">
              {detailFields.map(field => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>{field.render(selected_detail)}</dd>
                </div>
              ))}
            </dl>
            {renderDetailExtras ? renderDetailExtras(selected_detail) : null}
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}
