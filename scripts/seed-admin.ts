import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const passwordHash = await bcrypt.hash("secret123", 10);
  await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash },
    create: { email, password: passwordHash },
  });
  console.log("Seeded admin:", email);
}

main().finally(() => prisma.$disconnect());
