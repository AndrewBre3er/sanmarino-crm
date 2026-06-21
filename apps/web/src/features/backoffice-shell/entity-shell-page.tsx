import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { LoadingState } from "../../components/states/loading-state";
import { PageHeader, PageSection, PageShell } from "../../components/shell/page-shell";
import { StatusBadge } from "../../components/ui/status-badge";
import type { AuthRoleCode } from "../../contracts/backoffice-shell.contract";
import { role_russian_labels } from "../../contracts/backoffice-shell.contract";

interface EntityShellPageProps {
  title: string;
  subtitle: string;
  roleCode: AuthRoleCode;
  statuses: readonly string[];
  columns: readonly string[];
}

export function EntityShellPage({
  title,
  subtitle,
  roleCode,
  statuses,
  columns
}: EntityShellPageProps) {
  const roleLabel = role_russian_labels[roleCode];

  return (
    <PageShell>
      <PageHeader
        title={title}
        subtitle={subtitle}
        note="Shell-only page. Read-only placeholders are shown until backend UI contracts are wired."
      />

      <PageSection
        title="Status Context"
        description="Reusable status badge component with contract-backed enum tone mapping"
      >
        <div className="bo-badge-row">
          {statuses.map(status => (
            <StatusBadge key={status} label={status} />
          ))}
        </div>
      </PageSection>

      <PageSection
        title="List Layout Skeleton"
        description={`Role-aware context: ${roleLabel}`}
      >
        <div className="bo-table-shell" role="table" aria-label={`${title} shell table`}>
          <div className="bo-table-row bo-table-header" role="row">
            {columns.map(column => (
              <span key={column} role="columnheader">
                {column}
              </span>
            ))}
          </div>
          <div className="bo-table-row" role="row">
            <span role="cell" className="bo-muted">
              TODO: list data source
            </span>
            <span role="cell" className="bo-muted">
              TODO: read-model wiring
            </span>
            <span role="cell" className="bo-muted">
              TODO: pagination contract
            </span>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Reusable Data States"
        description="Shared state components for list/detail widgets"
      >
        <div className="bo-state-grid">
          <LoadingState label="Loading shell rows..." />
          <EmptyState
            title="No records in shell"
            description="Entity list is intentionally empty until real read endpoints are connected."
          />
          <ErrorState
            title="Shell error presentation"
            message="Backend error mapping is deferred; this component defines the UI shell footprint only."
          />
        </div>
      </PageSection>
    </PageShell>
  );
}
