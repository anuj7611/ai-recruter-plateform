import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { registerSchema } from "../modules/auth/auth.validation.js";
import { hashPassword } from "../utils/security/password.js";

const main = async () => {
  const input = registerSchema.parse({
    name: process.env.SUPER_ADMIN_NAME,
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  });

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true },
  });

  if (existing) {
    if (existing.role !== "SUPER_ADMIN") {
      throw new Error(
        "That email already belongs to a non-super-admin account. Refusing to elevate it.",
      );
    }

    console.log("Super admin already exists; no changes were made.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: "SUPER_ADMIN",
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`Created ${user.role} account for ${user.email} (${user.id}).`);
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
