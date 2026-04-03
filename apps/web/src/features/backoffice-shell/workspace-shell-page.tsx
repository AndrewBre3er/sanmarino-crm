import type { WorkspaceCode } from "../../contracts/backoffice-shell.contract";
import { workspace_descriptors } from "../../contracts/backoffice-shell.contract";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { LoadingState } from "../../components/states/loading-state";
import { PageHeader, PageSection, PageShell } from "../../components/shell/page-shell";

interface WorkspaceShellPageProps {
  workspace: WorkspaceCode;
  modules: readonly string[];
  title: string;
  subtitle: string;
}

export function WorkspaceShellPage({
  workspace,
  modules,
  title,
  subtitle
}: WorkspaceShellPageProps) {
  const descriptor = workspace_descriptors[workspace];

  return (
    <PageShell>
      <PageHeader
        title={title}
        subtitle={subtitle}
        note="Shell-only workspace page. Data wiring is intentionally deferred."
      />

      <PageSection
        title="Workspace Scope"
        description="Role-aware module visibility at shell/navigation level"
      >
        <ul className="bo-list-grid">
          {modules.map(moduleName => (
            <li key={moduleName}>{moduleName}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection
        title="Operational Frame"
        description={`Current route is mapped to ${descriptor.title}.`}
      >
        <div className="bo-state-grid">
          <LoadingState label="Loading state component for workspace-level widgets." />
          <EmptyState
            title="No workspace data wired"
            description="Connect read models once backend list/read contracts are confirmed for this workspace."
          />
          <ErrorState
            title="Data unavailable"
            message="Error presentation is shell-only. Recovery actions are intentionally deferred."
          />
        </div>
      </PageSection>
    </PageShell>
  );
}
