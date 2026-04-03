export function get_env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
