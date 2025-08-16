import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // cria roles base
  const [admin, editor, viewer] = await Promise.all([
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

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@example.com" },
  });
  if (adminUser) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: admin.id } },
      update: {},
      create: { userId: adminUser.id, roleId: admin.id },
    });
    console.log("Admin has ADMIN role");
  } else {
    console.log("admin@example.com not found; create user first");
  }
}

main().finally(() => prisma.$disconnect());
