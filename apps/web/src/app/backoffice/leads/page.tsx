import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const lead_statuses = ["draft", "qualified", "lost"] as const;
const lead_columns = ["Lead", "Source", "Status"] as const;

export default function LeadsShellPage() {
  return (
    <EntityShellPage
      title="Leads"
      subtitle="CRM lead list shell"
      workspace="sales"
      statuses={lead_statuses}
      columns={lead_columns}
    />
  );
}
