import { redirect } from "next/navigation";
import { resolve_role_home_path } from "../../contracts/backoffice-shell.contract";
import { read_current_session } from "../../lib/auth/server-auth";

export default async function BackofficeIndexPage() {
  const session = await read_current_session();
  if (!session) {
    redirect("/login");
  }

  redirect(resolve_role_home_path(session.user.primaryRole));
}
