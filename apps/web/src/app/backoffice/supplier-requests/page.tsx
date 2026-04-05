import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";
import { require_current_session } from "../../../lib/auth/server-auth";

const supplier_request_statuses = [
  "formed",
  "confirmed_by_supplier",
  "paid",
  "stocked"
] as const;
const supplier_request_columns = ["Supplier Request", "Source", "Status"] as const;

export default async function SupplierRequestsShellPage() {
  const session = await require_current_session();

  return (
    <EntityShellPage
      title="Supplier Requests"
      subtitle="Supplier request shell"
      roleCode={session.user.roleCode}
      statuses={supplier_request_statuses}
      columns={supplier_request_columns}
    />
  );
}
