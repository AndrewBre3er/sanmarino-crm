import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const admin_modules = ["Users (shell)", "Roles and Permissions (shell)", "System Health (shell)"] as const;

export default function AdminWorkspacePage() {
  return (
    <WorkspaceShellPage
      roleCode="admin"
      title="Admin Workspace"
      subtitle="Technical administration shell"
      modules={admin_modules}
    />
  );
}
