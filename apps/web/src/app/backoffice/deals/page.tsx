import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const deal_statuses = ["in_progress", "converted_to_order", "cancelled"] as const;
const deal_columns = ["Deal", "Responsible", "Status"] as const;

export default function DealsShellPage() {
  return (
    <EntityShellPage
      title="Deals"
      subtitle="CRM deal pipeline shell"
      roleCode="seller"
      statuses={deal_statuses}
      columns={deal_columns}
    />
  );
}
