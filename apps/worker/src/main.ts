import { bootstrapWorkers } from "./workers/worker.bootstrap.js";

async function main(): Promise<void> {
  await bootstrapWorkers();
}

main().catch((error) => {
  console.error("Worker bootstrap failed", error);
  process.exit(1);
});
