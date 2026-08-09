/**
 * One-shot admin bootstrap for production.
 * Usage:
 *   ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD='StrongPass1!' ADMIN_NAME='Ops' \
 *   npx ts-node scripts/bootstrap-admin.ts
 *
 * Safe to re-run: updates password/role if the user already exists.
 * Never use prisma/seed.ts in production (it wipes data).
 */
import { PrismaClient, Role, StudentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password || password.length < 8) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars). Optional ADMIN_NAME.',
    );
  }

  const hash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        password: hash,
        role: Role.ADMIN,
        status: StudentStatus.VERIFIED,
        verificationToken: null,
        tokenExpiresAt: null,
      },
    });
    console.log(`Updated existing user to ADMIN: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: Role.ADMIN,
        status: StudentStatus.VERIFIED,
      },
    });
    console.log(`Created ADMIN: ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
