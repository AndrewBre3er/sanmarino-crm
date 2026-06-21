import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import {
  fetch_admin_permissions,
  fetch_admin_roles
} from "../../../lib/auth/backoffice-admin-api";
import { require_admin_session } from "../../../lib/auth/server-auth";

function permission_group_key(code: string): string {
  const dotIndex = code.indexOf(".");
  if (dotIndex > 0) {
    return code.slice(0, dotIndex);
  }

  const colonIndex = code.indexOf(":");
  if (colonIndex > 0) {
    return code.slice(0, colonIndex);
  }

  return "other";
}

export default async function BackofficeRolesPage() {
  await require_admin_session();
  const [rolesResult, permissionsResult] = await Promise.all([
    fetch_admin_roles(),
    fetch_admin_permissions()
  ]);

  const permissionGroupEntries = [...permissionsResult.data].reduce<Map<string, number>>(
    (acc, permission) => {
      const group = permission_group_key(permission.code);
      acc.set(group, (acc.get(group) ?? 0) + 1);
      return acc;
    },
    new Map<string, number>()
  );

  const sortedPermissionGroups = [...permissionGroupEntries.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return (
    <PageShell>
      <PageHeader
        title="Roles"
        subtitle="Admin-only roles and permissions baseline"
        note="Sources: backend /roles and /permissions endpoints."
      />

      <PageSection
        title="Canonical Roles"
        description="Read-only list from users.roles with status and department binding."
      >
        {rolesResult.error ? (
          <ErrorState title="Roles request failed" message={rolesResult.error} />
        ) : rolesResult.data.length === 0 ? (
          <EmptyState
            title="No roles returned"
            description="Backend returned an empty list for /roles."
          />
        ) : (
          <ul className="bo-list-grid">
            {rolesResult.data.map(role => (
              <li key={role.id}>
                <strong>{role.code}</strong>
                <p className="bo-muted">{role.name}</p>
                <p className="bo-muted">
                  Status: {role.status} | Department: {role.departmentCode ?? "not set"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection
        title="Permissions Summary"
        description="Grouped by code prefix for quick role-to-permission visibility."
      >
        {permissionsResult.error ? (
          <ErrorState title="Permissions request failed" message={permissionsResult.error} />
        ) : permissionsResult.data.length === 0 ? (
          <EmptyState
            title="No permissions returned"
            description="Backend returned an empty list for /permissions."
          />
        ) : (
          <>
            <p className="bo-muted">Total permissions: {permissionsResult.data.length}</p>
            <ul className="bo-list-grid">
              {sortedPermissionGroups.map(([group, total]) => (
                <li key={group}>
                  <strong>{group}</strong>
                  <p className="bo-muted">{total} permission(s)</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </PageSection>
    </PageShell>
  );
}
