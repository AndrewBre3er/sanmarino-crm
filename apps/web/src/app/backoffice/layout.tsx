import { BackofficeShell } from "../../components/shell/backoffice-shell";
import { require_current_session } from "../../lib/auth/server-auth";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const session = await require_current_session();

  return <BackofficeShell viewer={session.user}>{children}</BackofficeShell>;
}
