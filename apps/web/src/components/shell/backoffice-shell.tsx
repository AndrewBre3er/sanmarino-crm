"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  backoffice_shell_todo_note,
  get_workspace_navigation,
  resolve_workspace_from_path,
  workspace_codes,
  workspace_descriptors,
  type WorkspaceCode
} from "../../contracts/backoffice-shell.contract";

interface BackofficeShellProps {
  children: React.ReactNode;
}

function WorkspaceSwitcher({ activeWorkspace }: { activeWorkspace: WorkspaceCode }) {
  return (
    <nav aria-label="Workspace switcher" className="bo-workspace-switcher">
      {workspace_codes.map(workspaceCode => {
        const workspace = workspace_descriptors[workspaceCode];
        const isActive = workspaceCode === activeWorkspace;

        return (
          <Link
            key={workspace.code}
            href={workspace.homePath}
            className={`bo-workspace-chip${isActive ? " bo-workspace-chip-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {workspace.title}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceNavigation({ activeWorkspace }: { activeWorkspace: WorkspaceCode }) {
  const items = get_workspace_navigation(activeWorkspace);

  return (
    <nav aria-label="Role-aware navigation" className="bo-sidebar-nav">
      <ul>
        {items.map(item => (
          <li key={item.key}>
            <Link href={item.path}>{item.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BackofficeShell({ children }: BackofficeShellProps) {
  const pathname = usePathname();
  const activeWorkspace = resolve_workspace_from_path(pathname);
  const activeWorkspaceDescriptor = workspace_descriptors[activeWorkspace];

  return (
    <div className="bo-shell-root">
      <header className="bo-topbar">
        <div className="bo-topbar-title-wrap">
          <p className="bo-kicker">Backoffice Shell</p>
          <h1>Sanmarino CRM/ERP</h1>
          <p className="bo-muted">{activeWorkspaceDescriptor.subtitle}</p>
        </div>
        <WorkspaceSwitcher activeWorkspace={activeWorkspace} />
      </header>

      <div className="bo-shell-frame">
        <aside className="bo-sidebar">
          <h2>{activeWorkspaceDescriptor.title}</h2>
          <WorkspaceNavigation activeWorkspace={activeWorkspace} />
          <p className="bo-sidebar-note">{backoffice_shell_todo_note}</p>
        </aside>

        <main className="bo-content">{children}</main>
      </div>
    </div>
  );
}
