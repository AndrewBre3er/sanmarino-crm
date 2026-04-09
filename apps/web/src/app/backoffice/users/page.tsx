import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { fetch_admin_users } from "../../../lib/auth/backoffice-admin-api";
import { require_admin_session } from "../../../lib/auth/server-auth";

export default async function BackofficeUsersPage() {
  await require_admin_session();
  const usersResult = await fetch_admin_users();

  return (
    <PageShell>
      <PageHeader
        title="Users"
        subtitle="Admin-only read model"
        note="Source: backend /users endpoint with backend RBAC checks."
      />

      <PageSection
        title="User Directory"
        description="Minimal baseline list for users, departments, and assigned canonical roles."
      >
        {usersResult.error ? (
          <ErrorState title="Users request failed" message={usersResult.error} />
        ) : usersResult.data.length === 0 ? (
          <EmptyState
            title="No users returned"
            description="Backend returned an empty list for /users."
          />
        ) : (
          <ul className="bo-list-grid">
            {usersResult.data.map(user => (
              <li key={user.id}>
                <strong>{user.displayName}</strong>
                <p className="bo-muted">{user.email}</p>
                <p className="bo-muted">
                  Roles: {user.roleCodes.length > 0 ? user.roleCodes.join(", ") : "none"}
                </p>
                <p className="bo-muted">
                  Department: {user.departmentCode ?? "not set"} | Status:{" "}
                  {user.isActive ? "active" : "inactive"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </PageShell>
  );
}
