import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";

const integration_sources = ["ATS", "Avito"] as const;
const integration_statuses = ["received", "processed", "rejected"] as const;

export default async function IntegrationsPage() {
  const session = await require_current_session();

  return (
    <PageShell>
      <PageHeader
        title="Integration Inbound Inbox"
        subtitle="ATS and Avito inbound baseline"
        note="Backend command surface: POST /integrations/ats/events and POST /integrations/avito/events."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection title="Sources" description="Accepted inbound source systems">
        <ul className="bo-list-grid">
          {integration_sources.map(source => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Inbox Statuses" description="Durable inbox processing states">
        <div className="bo-badge-row">
          {integration_statuses.map(status => (
            <StatusBadge key={status} label={status} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Validation Gate" description="Server-side accepted baseline">
        <ul className="bo-list-grid">
          <li>Idempotency by source and external event</li>
          <li>Audit trace for accepted inbound events</li>
          <li>Domain side effects stay behind backend rules</li>
        </ul>
      </PageSection>
    </PageShell>
  );
}
