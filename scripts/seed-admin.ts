import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // Create roles first
  const [adminRole, editorRole, viewerRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    }),
    prisma.role.upsert({
      where: { name: "EDITOR" },
      update: {},
      create: { name: "EDITOR" },
    }),
    prisma.role.upsert({
      where: { name: "VIEWER" },
      update: {},
      create: { name: "VIEWER" },
    }),
  ]);
  console.log("Created roles: ADMIN, EDITOR, VIEWER");

  // Create admin user
  const email = "admin@example.com";
  const passwordHash = await bcrypt.hash("secret123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash },
    create: { email, password: passwordHash },
  });
  console.log("Seeded admin:", email);

  // Assign ADMIN role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log("Assigned ADMIN role to admin user");
}

main().finally(() => prisma.$disconnect());
