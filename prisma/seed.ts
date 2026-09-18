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
  const orgName = process.env.DEFAULT_ORG_NAME ?? "ICDeC";
  const orgSlug = process.env.DEFAULT_ORG_SLUG ?? "icdec";
  const email = process.env.ADMIN_EMAIL ?? "jbercasio@gmail.com";
  const name = process.env.ADMIN_NAME ?? "Justine Bercasio";
  const username = process.env.ADMIN_USERNAME ?? "justine";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is required to seed. Set it before running prisma db seed."
    );
  }

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: orgName,
      slug: orgSlug,
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", orgId: org.id },
    create: {
      email,
      username,
      name,
      role: "ADMIN",
      orgId: org.id,
      passwordHash,
    },
  });

  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  if (superEmail && superEmail === email) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: "SUPER_ADMIN" },
    });
    console.log(`  Super admin promoted: ${email}`);
  }

  console.log("Production bootstrap complete.");
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Admin email : ${admin.email}`);
  console.log(`  Admin name  : ${admin.name}`);
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