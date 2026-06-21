import Link from "next/link";
import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";
import {
  fetch_supplier_request_detail,
  fetch_supplier_requests_list
} from "../../../lib/supply/supply-api";
import {
  can_view_supplier_request_attachment_for_roles,
  supplier_request_statuses
} from "../../../lib/supply/supply-contract";

interface SupplierRequestsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function resolve_query_value(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((item) => item.length > 0);
    return firstValue;
  }

  return undefined;
}

function to_attachment_availability_label(
  canViewAttachments: boolean,
  supplierDocumentUrl: string | null
): string {
  if (!canViewAttachments) {
    return "Restricted for current role";
  }

  if (!supplierDocumentUrl) {
    return "No attachment";
  }

  return "Attachment available";
}

export default async function SupplierRequestsPage({ searchParams }: SupplierRequestsPageProps) {
  const session = await require_current_session();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedSupplierRequestId = resolve_query_value(resolvedSearchParams.supplierRequestId);
  const canViewAttachments = can_view_supplier_request_attachment_for_roles(session.user.roleCodes);

  const [supplierRequestsResult, supplierRequestDetailResult] = await Promise.all([
    fetch_supplier_requests_list(),
    selectedSupplierRequestId
      ? fetch_supplier_request_detail(selectedSupplierRequestId)
      : Promise.resolve({ data: null, error: null })
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Supplier Requests"
        subtitle="Supply baseline (read-first)"
        note="Source: backend GET /supplier-requests and GET /supplier-requests/:id; backend RBAC is authoritative."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection
        title="Status Context"
        description="SupplierRequest statuses from accepted API contract."
      >
        <div className="bo-badge-row">
          {supplier_request_statuses.map((status) => (
            <StatusBadge key={status} label={status} />
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Supplier Request List"
        description="Minimal list wired to backend read-side endpoint."
      >
        {supplierRequestsResult.error ? (
          <ErrorState title="Supplier requests request failed" message={supplierRequestsResult.error} />
        ) : supplierRequestsResult.data.length === 0 ? (
          <EmptyState
            title="No supplier requests returned"
            description="Backend returned an empty list for GET /supplier-requests."
          />
        ) : (
          <>
            {supplierRequestsResult.pagination ? (
              <p className="bo-muted">
                Total: {supplierRequestsResult.pagination.totalItems}, page{" "}
                {supplierRequestsResult.pagination.page} of{" "}
                {supplierRequestsResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {supplierRequestsResult.data.map((supplierRequest) => (
                <li
                  key={supplierRequest.id}
                  className={
                    selectedSupplierRequestId === supplierRequest.id
                      ? "bo-crm-item bo-crm-item-selected"
                      : "bo-crm-item"
                  }
                >
                  <strong>{supplierRequest.supplier.name}</strong>
                  <p className="bo-muted">Request ID: {supplierRequest.id}</p>
                  <p className="bo-muted">
                    Source: {supplierRequest.businessSourceType} / {supplierRequest.businessSourceId}
                  </p>
                  <p className="bo-muted">Expected date: {supplierRequest.expectedSupplyDate}</p>
                  <p className="bo-muted">Items: {supplierRequest.itemsCount}</p>
                  <div className="bo-crm-row">
                    <StatusBadge label={supplierRequest.status} />
                    <span className="bo-muted">
                      Attachment view:{" "}
                      {canViewAttachments ? "allowed for role" : "restricted for role"}
                    </span>
                  </div>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={`/backoffice/supplier-requests?supplierRequestId=${encodeURIComponent(supplierRequest.id)}`}
                    >
                      Open detail
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </PageSection>

      <PageSection
        title="Supplier Request Detail"
        description="Minimal detail view from GET /supplier-requests/:id."
      >
        {!selectedSupplierRequestId ? (
          <EmptyState
            title="Select a supplier request"
            description="Use Open detail in the list to load supplier request detail from backend."
          />
        ) : supplierRequestDetailResult.error ? (
          <ErrorState
            title="Supplier request detail failed"
            message={supplierRequestDetailResult.error}
          />
        ) : !supplierRequestDetailResult.data ? (
          <EmptyState
            title="Supplier request not found"
            description="Selected supplier request was not returned by backend."
          />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID</strong>
              <p className="bo-muted">{supplierRequestDetailResult.data.id}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Status</strong>
              <div className="bo-crm-row">
                <StatusBadge label={supplierRequestDetailResult.data.status} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Supplier</strong>
              <p className="bo-muted">{supplierRequestDetailResult.data.supplier.name}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Expected supply date</strong>
              <p className="bo-muted">{supplierRequestDetailResult.data.expectedSupplyDate}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Business source</strong>
              <p className="bo-muted">
                {supplierRequestDetailResult.data.businessSourceType} /{" "}
                {supplierRequestDetailResult.data.businessSourceId}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Attachment availability</strong>
              <p className="bo-muted">
                {to_attachment_availability_label(
                  canViewAttachments,
                  supplierRequestDetailResult.data.supplierDocumentUrl
                )}
              </p>
              {canViewAttachments && supplierRequestDetailResult.data.supplierDocumentUrl ? (
                <a
                  className="bo-crm-link"
                  href={supplierRequestDetailResult.data.supplierDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open attachment
                </a>
              ) : null}
            </article>
            <article className="bo-crm-detail-item">
              <strong>Requested by</strong>
              <p className="bo-muted">{supplierRequestDetailResult.data.requestedBy}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Updated</strong>
              <p className="bo-muted">{supplierRequestDetailResult.data.updatedAt}</p>
            </article>
          </div>
        )}
      </PageSection>

      <PageSection
        title="Supplier Request Items"
        description="Line-level view from supplier request detail payload."
      >
        {!supplierRequestDetailResult.data ? (
          <EmptyState
            title="Detail is not loaded"
            description="Select a supplier request to inspect line items."
          />
        ) : supplierRequestDetailResult.data.items.length === 0 ? (
          <EmptyState
            title="No supplier request items"
            description="Backend returned supplier request without items."
          />
        ) : (
          <ul className="bo-list-grid">
            {supplierRequestDetailResult.data.items.map((item) => (
              <li key={item.id} className="bo-crm-item">
                <strong>Product: {item.productId}</strong>
                <p className="bo-muted">
                  Quantity: {item.quantity} {item.unit}
                </p>
                <p className="bo-muted">Source line: {item.sourceLineRef}</p>
                <p className="bo-muted">Updated: {item.updatedAt}</p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection
        title="Deferred Actions"
        description="Status mutation actions stay backend-only in this web slice."
      >
        <p className="bo-muted">
          `confirm-by-supplier`, `mark-paid` and `mark-stocked` actions are intentionally deferred
          in Step 10 to keep this web baseline read-first and aligned with existing backend
          contracts.
        </p>
      </PageSection>
    </PageShell>
  );
}
