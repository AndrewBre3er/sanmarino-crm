import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";
import { require_current_session } from "../../../lib/auth/server-auth";

const return_request_statuses = ["created", "confirmed", "processed", "closed"] as const;
const return_request_columns = ["Return Request", "Order", "Status"] as const;

export default async function ReturnRequestsShellPage() {
  const session = await require_current_session();

  return (
    <EntityShellPage
      title="Return Requests"
      subtitle="Return request shell"
      roleCode={session.user.roleCode}
      statuses={return_request_statuses}
      columns={return_request_columns}
    />
  );
}
