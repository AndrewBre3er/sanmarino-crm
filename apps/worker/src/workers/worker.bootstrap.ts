import { create_queue } from "../queues/queue.factory.js";
import { resolve_queue_names } from "../queues/queue.names.js";

export async function bootstrapWorkers(): Promise<void> {
  const queue_names = resolve_queue_names();
  const queues = Object.values(queue_names).map((queue_name) => create_queue(queue_name));

  await Promise.all(queues.map((queue) => queue.waitUntilReady()));
  console.info("Worker queues are ready", queue_names);
}
