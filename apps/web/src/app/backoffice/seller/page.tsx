import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const seller_modules = [
  "Leads",
  "Deals",
  "Orders",
  "Supplier Requests",
  "Return Requests",
  "Seller Home KPI (shell)"
] as const;

export default function SellerWorkspacePage() {
  return (
    <WorkspaceShellPage
      roleCode="seller"
      title="Seller Workspace"
      subtitle="Role-aware shell for lead-to-order operations"
      modules={seller_modules}
    />
  );
}
