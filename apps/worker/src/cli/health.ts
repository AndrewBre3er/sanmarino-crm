import { get_worker_health_snapshot } from "../health/worker-health.js";

const snapshot = get_worker_health_snapshot();
console.log(JSON.stringify(snapshot));
process.exit(snapshot.status === "ok" ? 0 : 1);
