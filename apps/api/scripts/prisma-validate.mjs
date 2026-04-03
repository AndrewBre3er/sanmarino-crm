import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sanmarino_crm"
};

const result = spawnSync("prisma", ["validate"], {
  stdio: "inherit",
  shell: true,
  env
});

process.exit(result.status ?? 1);
