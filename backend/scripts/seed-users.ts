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

  // Create users for each role
  const users = [
    {
      email: "admin@example.com",
      password: "admin123",
      role: adminRole,
      roleName: "ADMIN"
    },
    {
      email: "editor@example.com", 
      password: "editor123",
      role: editorRole,
      roleName: "EDITOR"
    },
    {
      email: "viewer@example.com",
      password: "viewer123", 
      role: viewerRole,
      roleName: "VIEWER"
    }
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { password: passwordHash },
      create: { email: userData.email, password: passwordHash },
    });
    console.log(`Seeded ${userData.roleName.toLowerCase()}:`, userData.email);

    // Assign role to user
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userData.role.id } },
      update: {},
      create: { userId: user.id, roleId: userData.role.id },
    });
    console.log(`Assigned ${userData.roleName} role to ${userData.email}`);
  }

  console.log("\n=== Test Users Created ===");
  console.log("Admin: admin@example.com / admin123");
  console.log("Editor: editor@example.com / editor123");
  console.log("Viewer: viewer@example.com / viewer123");
  console.log("========================\n");
}

main().finally(() => prisma.$disconnect());
