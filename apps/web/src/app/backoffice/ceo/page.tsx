import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const ceo_modules = [
  "Executive KPI (shell)",
  "Cross-domain Snapshot (shell)",
  "Risk and Audit Highlights (shell)"
] as const;

export default function CeoOverviewPage() {
  return (
    <WorkspaceShellPage
      roleCode="ceo"
      title="CEO Overview"
      subtitle="Cross-domain management shell"
      modules={ceo_modules}
    />
  );
}
