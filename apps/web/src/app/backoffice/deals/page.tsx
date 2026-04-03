import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const deal_statuses = ["draft", "negotiation", "won", "lost"] as const;
const deal_columns = ["Deal", "Responsible", "Status"] as const;

export default function DealsShellPage() {
  return (
    <EntityShellPage
      title="Deals"
      subtitle="CRM deal pipeline shell"
      workspace="sales"
      statuses={deal_statuses}
      columns={deal_columns}
    />
  );
}
