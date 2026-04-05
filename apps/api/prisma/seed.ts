import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type department_seed = {
  code: string;
  name: string;
};

type role_seed = {
  code: string;
  name: string;
  departmentCode?: string;
};

type permission_seed = {
  code: string;
  name: string;
  description: string;
};

type user_seed = {
  email: string;
  displayName: string;
  password: string;
  departmentCode?: string;
  roleCodes: string[];
};

const departments: department_seed[] = [
  { code: "administration", name: "Administration" },
  { code: "sales", name: "Sales" },
  { code: "warehouse", name: "Warehouse" },
  { code: "logistics", name: "Logistics" },
  { code: "finance", name: "Finance" },
  { code: "executive", name: "Executive" },
  { code: "marketing", name: "Marketing" }
];

const roles: role_seed[] = [
  { code: "admin", name: "Administrator", departmentCode: "administration" },
  { code: "seller", name: "Seller", departmentCode: "sales" },
  { code: "warehouse", name: "Warehouse", departmentCode: "warehouse" },
  { code: "logistics", name: "Logistics", departmentCode: "logistics" },
  { code: "finance", name: "Finance", departmentCode: "finance" },
  { code: "ceo", name: "CEO", departmentCode: "executive" },
  { code: "driver", name: "Driver", departmentCode: "logistics" },
  { code: "marketing", name: "Marketing", departmentCode: "marketing" }
];

const permissions: permission_seed[] = [
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

const users: user_seed[] = [
  {
    email: "admin.dev@sanmarino.local",
    displayName: "Dev Admin",
    password: "AdminDevPass!234",
    departmentCode: "administration",
    roleCodes: ["admin"]
  },
  {
    email: "seller.dev@sanmarino.local",
    displayName: "Dev Seller",
    password: "SellerDevPass!234",
    departmentCode: "sales",
    roleCodes: ["seller"]
  },
  {
    email: "warehouse.dev@sanmarino.local",
    displayName: "Dev Warehouse",
    password: "WarehouseDevPass!234",
    departmentCode: "warehouse",
    roleCodes: ["warehouse"]
  },
  {
    email: "logistics.dev@sanmarino.local",
    displayName: "Dev Logistics",
    password: "LogisticsDevPass!234",
    departmentCode: "logistics",
    roleCodes: ["logistics"]
  },
  {
    email: "finance.dev@sanmarino.local",
    displayName: "Dev Finance",
    password: "FinanceDevPass!234",
    departmentCode: "finance",
    roleCodes: ["finance"]
  },
  {
    email: "ceo.dev@sanmarino.local",
    displayName: "Dev CEO",
    password: "CeoDevPass!234",
    departmentCode: "executive",
    roleCodes: ["ceo"]
  }
];

function hash_password(raw_password: string): string {
  const digest = createHash("sha256").update(raw_password).digest("hex");
  return `sha256:${digest}`;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Seed is skipped.");
    return;
  }

  const department_ids = new Map<string, string>();

  for (const department of departments) {
    const row = await prisma.usersDepartment.upsert({
      where: { code: department.code },
      update: {
        name: department.name
      },
      create: {
        code: department.code,
        name: department.name
      }
    });
    department_ids.set(department.code, row.id);
  }

  const role_ids = new Map<string, string>();

  for (const role of roles) {
    const department_id = role.departmentCode ? department_ids.get(role.departmentCode) ?? null : null;

    const row = await prisma.usersRole.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        departmentId: department_id
      },
      create: {
        code: role.code,
        name: role.name,
        departmentId: department_id
      }
    });
    role_ids.set(role.code, row.id);
  }

  const permission_ids = new Map<string, string>();

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
    permission_ids.set(permission.code, row.id);
  }

  const admin_role_id = role_ids.get("admin");
  if (!admin_role_id) {
    throw new Error("Admin role id is missing after role seed.");
  }

  const role_permission_rows = Array.from(permission_ids.values()).map((permission_id) => ({
    roleId: admin_role_id,
    permissionId: permission_id
  }));

  await prisma.usersRolePermission.createMany({
    data: role_permission_rows,
    skipDuplicates: true
  });

  for (const user of users) {
    const department_id = user.departmentCode ? department_ids.get(user.departmentCode) ?? null : null;
    await prisma.usersUser.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        passwordHash: hash_password(user.password),
        departmentId: department_id,
        isActive: true
      },
      create: {
        email: user.email,
        passwordHash: hash_password(user.password),
        displayName: user.displayName,
        departmentId: department_id,
        isActive: true,
        mfaEnabled: false
      }
    });
  }

  const user_rows = await prisma.usersUser.findMany({
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

  const user_id_by_email = new Map(user_rows.map((row) => [row.email, row.id]));

  const user_role_rows = users.flatMap((user) => {
    const user_id = user_id_by_email.get(user.email);
    if (!user_id) {
      throw new Error(`Missing seeded user id for email: ${user.email}`);
    }

    return user.roleCodes.map((role_code) => {
      const role_id = role_ids.get(role_code);
      if (!role_id) {
        throw new Error(`Missing role id for role code: ${role_code}`);
      }

      return {
        userId: user_id,
        roleId: role_id
      };
    });
  });

  await prisma.usersUserRole.createMany({
    data: user_role_rows,
    skipDuplicates: true
  });

  console.log(
    `Seed completed: departments=${departments.length}, roles=${roles.length}, permissions=${permissions.length}, users=${users.length}`
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
