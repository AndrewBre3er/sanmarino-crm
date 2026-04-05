import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const lead_statuses = ["new", "in_processing", "cancelled"] as const;
const lead_columns = ["Lead", "Source", "Status"] as const;

export default function LeadsShellPage() {
  return (
    <EntityShellPage
      title="Leads"
      subtitle="CRM lead list shell"
      roleCode="seller"
      statuses={lead_statuses}
      columns={lead_columns}
    />
  );
}
