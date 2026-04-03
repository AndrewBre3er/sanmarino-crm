import { WorkspaceShellPage } from "../../../features/backoffice-shell/workspace-shell-page";

const finance_modules = [
  "Payments",
  "Refunds (shell)",
  "Reconciliation Center (shell)",
  "Finance Reports (shell)"
] as const;

export default function FinanceWorkspacePage() {
  return (
    <WorkspaceShellPage
      workspace="finance"
      title="Finance Workspace"
      subtitle="Role-aware shell for payment and reconciliation contexts"
      modules={finance_modules}
    />
  );
}
