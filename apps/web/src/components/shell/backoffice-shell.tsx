"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  backoffice_shell_todo_note,
  get_role_navigation,
  role_russian_labels
} from "../../contracts/backoffice-shell.contract";
import type { AuthUserView } from "../../lib/auth/auth-session";

interface BackofficeShellProps {
  children: React.ReactNode;
  viewer: AuthUserView;
}

function RoleNavigation({ viewer }: { viewer: AuthUserView }) {
  const pathname = usePathname();
  const items = get_role_navigation(viewer.roleCode);

  return (
    <nav aria-label="Role-aware navigation" className="bo-sidebar-nav">
      <ul>
        {items.map(item => {
          const isActive = pathname === item.path;

          return (
            <li key={item.key}>
              <Link
                href={item.path}
                className={isActive ? "bo-nav-link bo-nav-link-active" : "bo-nav-link"}
                aria-current={isActive ? "page" : undefined}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BackofficeShell({ children, viewer }: BackofficeShellProps) {
  const roleLabel = role_russian_labels[viewer.roleCode];

  return (
    <div className="bo-shell-root">
      <header className="bo-topbar">
        <div className="bo-topbar-title-wrap">
          <p className="bo-kicker">Backoffice Shell</p>
          <h1>Sanmarino CRM/ERP</h1>
          <p className="bo-muted">Роль: {roleLabel}</p>
        </div>

        <div className="bo-user-box">
          <p className="bo-user-name">{viewer.displayName}</p>
          <p className="bo-user-login">{viewer.login}</p>
          <form action="/logout" method="post">
            <button type="submit" className="bo-logout-button">
              Выйти
            </button>
          </form>
        </div>
      </header>

      <div className="bo-shell-frame">
        <aside className="bo-sidebar">
          <h2>{roleLabel}</h2>
          <RoleNavigation viewer={viewer} />
          <p className="bo-sidebar-note">{backoffice_shell_todo_note}</p>
        </aside>

        <main className="bo-content">{children}</main>
      </div>
    </div>
  );
}
