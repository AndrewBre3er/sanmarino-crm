import { web_app_shell_contract } from "../contracts/app-shell.contract";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Sanmarino CRM Web Bootstrap</h1>
      <p>Minimal app shell only. Product screens are intentionally deferred.</p>
      <ul>
        <li>Health: {web_app_shell_contract.health_path}</li>
        <li>Readiness: {web_app_shell_contract.readiness_path}</li>
      </ul>
    </main>
  );
}
