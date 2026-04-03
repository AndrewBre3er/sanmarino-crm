import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const return_request_statuses = ["draft", "submitted", "approved", "processed", "closed"] as const;
const return_request_columns = ["Return Request", "Order", "Status"] as const;

export default function ReturnRequestsShellPage() {
  return (
    <EntityShellPage
      title="Return Requests"
      subtitle="Return request shell"
      workspace="sales"
      statuses={return_request_statuses}
      columns={return_request_columns}
    />
  );
}
