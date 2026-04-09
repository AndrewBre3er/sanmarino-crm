import Link from "next/link";
import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";
import { fetch_crm_deal_detail, fetch_crm_deals_list } from "../../../lib/crm/crm-api";
import { crm_deal_statuses } from "../../../lib/crm/crm-contract";

interface DealsPageProps {
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

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const session = await require_current_session();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedDealId = resolve_query_value(resolvedSearchParams.dealId);

  const [dealsResult, dealDetailResult] = await Promise.all([
    fetch_crm_deals_list(),
    selectedDealId
      ? fetch_crm_deal_detail(selectedDealId)
      : Promise.resolve({ data: null, error: null })
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Deals"
        subtitle="CRM deals baseline (read-first)"
        note="Source: backend GET /deals and GET /deals/:dealId with backend access baseline."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection
        title="Status Context"
        description="Deal statuses from accepted CRM contract."
      >
        <div className="bo-badge-row">
          {crm_deal_statuses.map((status) => (
            <StatusBadge key={status} label={status} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Deal List" description="Minimal list wired to backend read-side endpoint.">
        {dealsResult.error ? (
          <ErrorState title="Deals request failed" message={dealsResult.error} />
        ) : dealsResult.data.length === 0 ? (
          <EmptyState
            title="No deals returned"
            description="Backend returned an empty list for GET /deals."
          />
        ) : (
          <>
            {dealsResult.pagination ? (
              <p className="bo-muted">
                Total: {dealsResult.pagination.totalItems}, page {dealsResult.pagination.page} of{" "}
                {dealsResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {dealsResult.data.map((deal) => (
                <li
                  key={deal.id}
                  className={
                    selectedDealId === deal.id ? "bo-crm-item bo-crm-item-selected" : "bo-crm-item"
                  }
                >
                  <strong>{deal.title}</strong>
                  <p className="bo-muted">ID: {deal.id}</p>
                  <p className="bo-muted">Client: {deal.clientId}</p>
                  <p className="bo-muted">Responsible: {deal.responsibleUserId ?? "not set"}</p>
                  <div className="bo-crm-row">
                    <StatusBadge label={deal.status} />
                    <span className="bo-muted">Updated: {deal.updatedAt}</span>
                  </div>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={`/backoffice/deals?dealId=${encodeURIComponent(deal.id)}`}
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
        title="Deal Detail"
        description="Minimal detail view from GET /deals/:dealId."
      >
        {!selectedDealId ? (
          <EmptyState
            title="Select a deal"
            description="Use Open detail in the list to load deal detail from backend."
          />
        ) : dealDetailResult.error ? (
          <ErrorState title="Deal detail request failed" message={dealDetailResult.error} />
        ) : !dealDetailResult.data ? (
          <EmptyState
            title="Deal not found"
            description="Selected deal was not returned by backend."
          />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID</strong>
              <p className="bo-muted">{dealDetailResult.data.id}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Status</strong>
              <div className="bo-crm-row">
                <StatusBadge label={dealDetailResult.data.status} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Title</strong>
              <p className="bo-muted">{dealDetailResult.data.title}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Responsible</strong>
              <p className="bo-muted">{dealDetailResult.data.responsibleUserId ?? "not set"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Lead / Client / Contact</strong>
              <p className="bo-muted">
                {dealDetailResult.data.leadId ?? "no lead"} / {dealDetailResult.data.clientId} /{" "}
                {dealDetailResult.data.contactId ?? "no contact"}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Notes</strong>
              <p className="bo-muted">{dealDetailResult.data.notes ?? "no notes"}</p>
            </article>
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}
