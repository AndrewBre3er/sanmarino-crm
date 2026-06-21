import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const marketing_modules = [
  "Channels (shell)",
  "Attribution (shell)",
  "Marketing Expenses (shell)"
] as const;

export default function MarketingWorkspacePage() {
  return (
    <WorkspaceShellPage
      roleCode="marketing"
      title="Marketing Workspace"
      subtitle="Channel analytics shell"
      modules={marketing_modules}
    />
  );
}
