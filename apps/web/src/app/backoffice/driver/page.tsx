import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const driver_modules = [
  "Today Route (shell)",
  "Delivery Tasks (shell)",
  "Issues Reporting (shell)"
] as const;

export default function DriverWorkspacePage() {
  return (
    <WorkspaceShellPage
      roleCode="driver"
      title="Driver Workspace"
      subtitle="Delivery execution shell"
      modules={driver_modules}
    />
  );
}
