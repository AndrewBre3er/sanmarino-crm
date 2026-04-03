import { Queue } from "bullmq";

function resolve_connection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined
  };
}

export function create_queue(name: string): Queue {
  // TODO(phase-2): keep queue bootstrap infrastructure-only.
  return new Queue(name, { connection: resolve_connection() });
}
