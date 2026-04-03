import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const order_statuses = ["draft", "confirmed", "in_progress", "completed"] as const;
const order_columns = ["Order", "Deal", "Status"] as const;

export default function OrdersShellPage() {
  return (
    <EntityShellPage
      title="Orders"
      subtitle="Order list shell"
      workspace="sales"
      statuses={order_statuses}
      columns={order_columns}
    />
  );
}
