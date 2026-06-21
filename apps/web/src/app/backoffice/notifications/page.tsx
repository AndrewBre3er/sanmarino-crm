import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";

const notification_channels = ["Telegram", "MAX"] as const;
const notification_statuses = ["queued", "sent", "failed"] as const;

export default async function NotificationsPage() {
  const session = await require_current_session();

  return (
    <PageShell>
      <PageHeader
        title="Notification Dispatch Log"
        subtitle="Telegram and MAX outbound baseline"
        note="Backend command surface: POST /notifications/telegram and POST /notifications/max."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection title="Channels" description="Accepted outbound channels">
        <ul className="bo-list-grid">
          {notification_channels.map(channel => (
            <li key={channel}>{channel}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Dispatch Statuses" description="Traceable delivery states">
        <div className="bo-badge-row">
          {notification_statuses.map(status => (
            <StatusBadge key={status} label={status} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Routing Gate" description="Permission-safe notification baseline">
        <ul className="bo-list-grid">
          <li>Dispatch must reference a domain fact</li>
          <li>Audit trace is required for critical dispatches</li>
          <li>Provider delivery remains a separate adapter step</li>
        </ul>
      </PageSection>
    </PageShell>
  );
}
