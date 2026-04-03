import { BackofficeShell } from "../../components/shell/backoffice-shell";

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return <BackofficeShell>{children}</BackofficeShell>;
}
