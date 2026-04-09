import Link from "next/link";
import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";
import { fetch_crm_lead_detail, fetch_crm_leads_list } from "../../../lib/crm/crm-api";
import { crm_lead_statuses } from "../../../lib/crm/crm-contract";

interface LeadsPageProps {
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

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await require_current_session();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedLeadId = resolve_query_value(resolvedSearchParams.leadId);

  const [leadsResult, leadDetailResult] = await Promise.all([
    fetch_crm_leads_list(),
    selectedLeadId
      ? fetch_crm_lead_detail(selectedLeadId)
      : Promise.resolve({ data: null, error: null })
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        subtitle="CRM leads baseline (read-first)"
        note="Source: backend GET /leads and GET /leads/:leadId; backend RBAC/state-machine is authoritative."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection
        title="Status Context"
        description="Lead statuses from accepted CRM contract."
      >
        <div className="bo-badge-row">
          {crm_lead_statuses.map((status) => (
            <StatusBadge key={status} label={status} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Lead List" description="Minimal list wired to backend read-side endpoint.">
        {leadsResult.error ? (
          <ErrorState title="Leads request failed" message={leadsResult.error} />
        ) : leadsResult.data.length === 0 ? (
          <EmptyState
            title="No leads returned"
            description="Backend returned an empty list for GET /leads."
          />
        ) : (
          <>
            {leadsResult.pagination ? (
              <p className="bo-muted">
                Total: {leadsResult.pagination.totalItems}, page {leadsResult.pagination.page} of{" "}
                {leadsResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {leadsResult.data.map((lead) => (
                <li
                  key={lead.id}
                  className={
                    selectedLeadId === lead.id ? "bo-crm-item bo-crm-item-selected" : "bo-crm-item"
                  }
                >
                  <strong>{lead.title ?? `Lead ${lead.id}`}</strong>
                  <p className="bo-muted">ID: {lead.id}</p>
                  <p className="bo-muted">Source: {lead.source}</p>
                  <p className="bo-muted">Responsible: {lead.responsibleUserId ?? "not set"}</p>
                  <div className="bo-crm-row">
                    <StatusBadge label={lead.status} />
                    <span className="bo-muted">Updated: {lead.updatedAt}</span>
                  </div>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={`/backoffice/leads?leadId=${encodeURIComponent(lead.id)}`}
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
        title="Lead Detail"
        description="Minimal detail view from GET /leads/:leadId."
      >
        {!selectedLeadId ? (
          <EmptyState
            title="Select a lead"
            description="Use Open detail in the list to load lead detail from backend."
          />
        ) : leadDetailResult.error ? (
          <ErrorState title="Lead detail request failed" message={leadDetailResult.error} />
        ) : !leadDetailResult.data ? (
          <EmptyState
            title="Lead not found"
            description="Selected lead was not returned by backend."
          />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID</strong>
              <p className="bo-muted">{leadDetailResult.data.id}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Status</strong>
              <div className="bo-crm-row">
                <StatusBadge label={leadDetailResult.data.status} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Source</strong>
              <p className="bo-muted">{leadDetailResult.data.source}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Responsible</strong>
              <p className="bo-muted">{leadDetailResult.data.responsibleUserId ?? "not set"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Client / Contact</strong>
              <p className="bo-muted">
                {leadDetailResult.data.clientId ?? "no client"} /{" "}
                {leadDetailResult.data.contactId ?? "no contact"}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Notes</strong>
              <p className="bo-muted">{leadDetailResult.data.notes ?? "no notes"}</p>
            </article>
          </div>
        )}
      </PageSection>

      <PageSection
        title="Deferred Mutations"
        description="Create/status actions are intentionally deferred in Step 6 to keep web scope read-first."
      >
        <p className="bo-muted">
          Lead create and status transition UI actions remain backend-ready but are deferred for a
          dedicated follow-up slice.
        </p>
      </PageSection>
    </PageShell>
  );
}
