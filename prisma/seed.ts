import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://ipon:ipon_pw@localhost:5433/ipon",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "jbercasio@gmail.com";
  const name = process.env.ADMIN_NAME ?? "Justine Bercasio";
  const username = process.env.ADMIN_USERNAME ?? "justine";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is required to seed. Set it before running prisma db seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: {
      email,
      username,
      name,
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log("Production bootstrap complete.");
  console.log(`  Admin email:  ${admin.email}`);
  console.log(`  Admin name :  ${admin.name}`);
  console.log("  Change the password after the first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });