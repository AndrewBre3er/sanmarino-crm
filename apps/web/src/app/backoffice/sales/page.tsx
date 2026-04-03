import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const sales_modules = [
  "Leads",
  "Deals",
  "Orders",
  "Return Requests",
  "Sales Home KPI (shell)"
] as const;

export default function SalesWorkspacePage() {
  return (
    <WorkspaceShellPage
      workspace="sales"
      title="Sales Workspace"
      subtitle="Role-aware shell for lead-to-order operations"
      modules={sales_modules}
    />
  );
}
