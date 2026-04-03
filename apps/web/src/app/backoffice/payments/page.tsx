import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const payment_statuses = ["pending", "completed", "refunded"] as const;
const payment_columns = ["Payment", "Order", "Status"] as const;

export default function PaymentsShellPage() {
  return (
    <EntityShellPage
      title="Payments"
      subtitle="Payment register shell"
      workspace="finance"
      statuses={payment_statuses}
      columns={payment_columns}
    />
  );
}
