import { createHash, scryptSync } from "node:crypto";
import { PrismaClient, RecordStatus } from "@prisma/client";

const prisma = new PrismaClient();

type DepartmentSeed = {
  code: string;
  name: string;
};

type RoleSeed = {
  code: string;
  name: string;
  departmentCode?: string;
};

type PermissionSeed = {
  code: string;
  name: string;
  description: string;
};

type UserSeed = {
  email: string;
  displayName: string;
  departmentCode?: string;
  roleCodes: string[];
};

const departments: DepartmentSeed[] = [
  { code: "administration", name: "Administration" },
  { code: "sales", name: "Sales" },
  { code: "warehouse", name: "Warehouse" },
  { code: "logistics", name: "Logistics" },
  { code: "finance", name: "Finance" },
  { code: "executive", name: "Executive" },
  { code: "marketing", name: "Marketing" }
];

const roles: RoleSeed[] = [
  { code: "admin", name: "Admin", departmentCode: "administration" },
  { code: "seller", name: "Seller", departmentCode: "sales" },
  { code: "warehouse", name: "Warehouse", departmentCode: "warehouse" },
  { code: "logistics", name: "Logistics", departmentCode: "logistics" },
  { code: "finance", name: "Finance", departmentCode: "finance" },
  { code: "ceo", name: "CEO", departmentCode: "executive" },
  { code: "driver", name: "Driver", departmentCode: "logistics" },
  { code: "marketing", name: "Marketing", departmentCode: "marketing" }
];

const permissions: PermissionSeed[] = [
  {
    code: "users.read",
    name: "Read Users",
    description: "Read users list and profile details."
  },
  {
    code: "users.manage_roles",
    name: "Manage User Roles",
    description: "Assign and revoke user roles."
  },
  {
    code: "users.manage_permissions",
    name: "Manage Role Permissions",
    description: "Manage role-permission mapping."
  },
  {
    code: "auth.read_me",
    name: "Read Current User",
    description: "Read current authenticated user profile."
  },
  {
    code: "crm.read",
    name: "Read CRM",
    description: "Read CRM entities."
  },
  {
    code: "orders.read",
    name: "Read Orders",
    description: "Read orders and related entities."
  },
  {
    code: "payments.read",
    name: "Read Payments",
    description: "Read payment entities."
  },
  {
    code: "inventory.read",
    name: "Read Inventory",
    description: "Read inventory entities."
  },
  {
    code: "logistics.read",
    name: "Read Logistics",
    description: "Read logistics entities."
  },
  {
    code: "returns.read",
    name: "Read Returns",
    description: "Read return request entities."
  }
];

const rolePermissionMatrix: Readonly<Record<string, readonly string[]>> = {
  admin: ["auth.read_me", "users.read", "users.manage_roles", "users.manage_permissions"],
  seller: ["auth.read_me", "crm.read", "orders.read", "inventory.read", "returns.read"],
  warehouse: ["auth.read_me", "orders.read", "inventory.read", "logistics.read", "returns.read"],
  logistics: ["auth.read_me", "orders.read", "logistics.read"],
  finance: ["auth.read_me", "orders.read", "payments.read", "returns.read"],
  ceo: [
    "auth.read_me",
    "crm.read",
    "orders.read",
    "payments.read",
    "inventory.read",
    "logistics.read",
    "returns.read"
  ],
  driver: ["auth.read_me", "logistics.read"],
  marketing: ["auth.read_me", "crm.read"]
};

const users: UserSeed[] = [
  {
    email: "admin.bootstrap@local",
    displayName: "Bootstrap Admin",
    departmentCode: "administration",
    roleCodes: ["admin"]
  },
  {
    email: "seller.bootstrap@local",
    displayName: "Bootstrap Seller",
    departmentCode: "sales",
    roleCodes: ["seller"]
  },
  {
    email: "warehouse.bootstrap@local",
    displayName: "Bootstrap Warehouse",
    departmentCode: "warehouse",
    roleCodes: ["warehouse"]
  },
  {
    email: "logistics.bootstrap@local",
    displayName: "Bootstrap Logistics",
    departmentCode: "logistics",
    roleCodes: ["logistics"]
  },
  {
    email: "finance.bootstrap@local",
    displayName: "Bootstrap Finance",
    departmentCode: "finance",
    roleCodes: ["finance"]
  },
  {
    email: "ceo.bootstrap@local",
    displayName: "Bootstrap CEO",
    departmentCode: "executive",
    roleCodes: ["ceo"]
  },
  {
    email: "driver.bootstrap@local",
    displayName: "Bootstrap Driver",
    departmentCode: "logistics",
    roleCodes: ["driver"]
  },
  {
    email: "marketing.bootstrap@local",
    displayName: "Bootstrap Marketing",
    departmentCode: "marketing",
    roleCodes: ["marketing"]
  }
];

function resolveBootstrapPassword(): string {
  const fromEnv = process.env.AUTH_BOOTSTRAP_DEFAULT_PASSWORD?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  console.warn(
    "AUTH_BOOTSTRAP_DEFAULT_PASSWORD is not set. Using fallback dev password for deterministic seed hashes."
  );
  return "change-me";
}

function hashPassword(email: string, rawPassword: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const saltHex = createHash("sha256")
    .update(`sanmarino-seed:${normalizedEmail}`)
    .digest("hex")
    .slice(0, 32);
  const derivedHex = scryptSync(rawPassword, Buffer.from(saltHex, "hex"), 64).toString("hex");
  return `scrypt:${saltHex}:${derivedHex}`;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not set. Seed is skipped.");
    return;
  }

  const bootstrapPassword = resolveBootstrapPassword();

  const departmentIds = new Map<string, string>();

  for (const department of departments) {
    const row = await prisma.usersDepartment.upsert({
      where: { code: department.code },
      update: {
        name: department.name,
        status: RecordStatus.ACTIVE
      },
      create: {
        code: department.code,
        name: department.name,
        status: RecordStatus.ACTIVE
      }
    });
    departmentIds.set(department.code, row.id);
  }

  const roleIds = new Map<string, string>();

  for (const role of roles) {
    const departmentId = role.departmentCode ? departmentIds.get(role.departmentCode) ?? null : null;
    if (role.departmentCode && !departmentId) {
      throw new Error(`Missing department for role: ${role.code} -> ${role.departmentCode}`);
    }

    const row = await prisma.usersRole.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        departmentId,
        status: RecordStatus.ACTIVE
      },
      create: {
        code: role.code,
        name: role.name,
        departmentId,
        status: RecordStatus.ACTIVE
      }
    });
    roleIds.set(role.code, row.id);
  }

  const permissionIds = new Map<string, string>();

  for (const permission of permissions) {
    const row = await prisma.usersPermission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description
      },
      create: {
        code: permission.code,
        name: permission.name,
        description: permission.description
      }
    });
    permissionIds.set(permission.code, row.id);
  }

  const rolePermissionRows: Array<{ roleId: string; permissionId: string }> = [];
  for (const [roleCode, permissionCodes] of Object.entries(rolePermissionMatrix)) {
    const roleId = roleIds.get(roleCode);
    if (!roleId) {
      throw new Error(`Missing role id for code: ${roleCode}`);
    }

    for (const permissionCode of permissionCodes) {
      const permissionId = permissionIds.get(permissionCode);
      if (!permissionId) {
        throw new Error(`Missing permission id for code: ${permissionCode}`);
      }

      rolePermissionRows.push({
        roleId,
        permissionId
      });
    }
  }

  await prisma.usersRolePermission.deleteMany({
    where: {
      roleId: {
        in: [...roleIds.values()]
      }
    }
  });

  await prisma.usersRolePermission.createMany({
    data: rolePermissionRows,
    skipDuplicates: true
  });

  for (const user of users) {
    const departmentId = user.departmentCode ? departmentIds.get(user.departmentCode) ?? null : null;
    if (user.departmentCode && !departmentId) {
      throw new Error(`Missing department for user: ${user.email} -> ${user.departmentCode}`);
    }

    await prisma.usersUser.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        passwordHash: hashPassword(user.email, bootstrapPassword),
        departmentId,
        isActive: true
      },
      create: {
        email: user.email,
        passwordHash: hashPassword(user.email, bootstrapPassword),
        displayName: user.displayName,
        departmentId,
        isActive: true,
        mfaEnabled: false
      }
    });
  }

  const userRows = await prisma.usersUser.findMany({
    where: {
      email: {
        in: users.map((user) => user.email)
      }
    },
    select: {
      id: true,
      email: true
    }
  });

  const userIdByEmail = new Map(userRows.map((row) => [row.email, row.id]));

  const userRoleRows: Array<{ userId: string; roleId: string }> = [];
  for (const user of users) {
    const userId = userIdByEmail.get(user.email);
    if (!userId) {
      throw new Error(`Missing seeded user id for email: ${user.email}`);
    }

    for (const roleCode of user.roleCodes) {
      const roleId = roleIds.get(roleCode);
      if (!roleId) {
        throw new Error(`Missing role id for role code: ${roleCode}`);
      }

      userRoleRows.push({
        userId,
        roleId
      });
    }
  }

  await prisma.usersUserRole.deleteMany({
    where: {
      userId: {
        in: [...userIdByEmail.values()]
      }
    }
  });

  await prisma.usersUserRole.createMany({
    data: userRoleRows,
    skipDuplicates: true
  });

  console.log(
    `Seed completed: departments=${departments.length}, roles=${roles.length}, permissions=${permissions.length}, users=${users.length}, role_permissions=${rolePermissionRows.length}, user_roles=${userRoleRows.length}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
