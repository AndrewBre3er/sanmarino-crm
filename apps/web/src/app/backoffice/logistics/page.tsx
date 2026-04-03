import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const logistics_modules = ["Delivery Tasks", "Delivery Calendar (shell)", "Incidents (shell)"] as const;

export default function LogisticsWorkspacePage() {
  return (
    <WorkspaceShellPage
      workspace="logistics"
      title="Logistics Workspace"
      subtitle="Role-aware shell for delivery operations"
      modules={logistics_modules}
    />
  );
}
