// scripts/seed-admin.mjs
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Admin Info
const ADMIN_EMAIL = "hoilamz@hawaii.edu";
const ADMIN_NAME  = "Hoi Lam (Lynn) Zhang";
const ADMIN_PASSWORD = "LabPassword";

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: hash, name: ADMIN_NAME, role: "ADMIN" },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      passwordHash: hash,
    },
  });

  console.log("Seeded admin:", { id: user.id, email: user.email, role: user.role });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
