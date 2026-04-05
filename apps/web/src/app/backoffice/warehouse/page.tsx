import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const warehouse_modules = [
  "Stock List (shell)",
  "Reservations (shell)",
  "Movements (shell)",
  "Returns (shell)"
] as const;

export default function WarehouseWorkspacePage() {
  return (
    <WorkspaceShellPage
      roleCode="warehouse"
      title="Warehouse Workspace"
      subtitle="Inventory and fulfillment shell"
      modules={warehouse_modules}
    />
  );
}
