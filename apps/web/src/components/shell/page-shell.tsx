import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  note?: string;
  rightSlot?: ReactNode;
}

interface PageSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return <div className="bo-page-shell">{children}</div>;
}

export function PageHeader({ title, subtitle, note, rightSlot }: PageHeaderProps) {
  return (
    <header className="bo-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="bo-muted">{subtitle}</p> : null}
        {note ? <p className="bo-shell-note">{note}</p> : null}
      </div>
      {rightSlot ? <div className="bo-page-header-side">{rightSlot}</div> : null}
    </header>
  );
}

export function PageSection({ title, description, children }: PageSectionProps) {
  return (
    <section className="bo-section-card">
      <header className="bo-section-header">
        <h2>{title}</h2>
        {description ? <p className="bo-muted">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
