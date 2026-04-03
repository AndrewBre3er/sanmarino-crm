import { EntityShellPage } from "../../../features/backoffice-shell/entity-shell-page";

const delivery_task_statuses = ["planned", "assigned", "in_transit", "delivered", "failed"] as const;
const delivery_task_columns = ["Task", "Order", "Status"] as const;

export default function DeliveryTasksShellPage() {
  return (
    <EntityShellPage
      title="Delivery Tasks"
      subtitle="Delivery task list shell"
      workspace="logistics"
      statuses={delivery_task_statuses}
      columns={delivery_task_columns}
    />
  );
}
