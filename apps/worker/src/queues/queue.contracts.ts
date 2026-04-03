export interface WorkerQueueContract {
  key: "outbox" | "kpi" | "reservation_expiry" | "reconciliation";
  env_key: string;
  default_name: string;
  purpose: string;
}

export const worker_queue_contracts: WorkerQueueContract[] = [
  {
    key: "outbox",
    env_key: "WORKER_OUTBOX_QUEUE",
    default_name: "system.outbox",
    purpose: "Infrastructure outbox dispatch placeholder"
  },
  {
    key: "kpi",
    env_key: "WORKER_KPI_QUEUE",
    default_name: "analytics.kpi",
    purpose: "KPI aggregate refresh placeholder"
  },
  {
    key: "reservation_expiry",
    env_key: "WORKER_RESERVATION_QUEUE",
    default_name: "inventory.reservation-expiry",
    purpose: "TTL cleanup placeholder"
  },
  {
    key: "reconciliation",
    env_key: "WORKER_RECONCILIATION_QUEUE",
    default_name: "reconciliation.daily",
    purpose: "Cross-domain reconciliation placeholder"
  }
];
