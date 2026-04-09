import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";
import { require_current_session } from "../../../lib/auth/server-auth";

const order_statuses = [
  "assembling",
  "ready_for_partial_shipment",
  "ready_for_shipment",
  "partially_shipped",
  "shipped"
] as const;
const order_columns = ["Order", "Deal", "Status"] as const;

export default async function OrdersShellPage() {
  const session = await require_current_session();

  return (
    <EntityShellPage
      title="Orders"
      subtitle="Order list shell"
      roleCode={session.user.primaryRole}
      statuses={order_statuses}
      columns={order_columns}
    />
  );
}
