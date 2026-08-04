import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { createSnapshot } from './db-snapshot';

const prisma = new PrismaClient();

async function main() {
  const snapshot = await createSnapshot(prisma as any);

  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `backup-${timestamp}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));

  console.log(`Backup written to ${file}`);
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    console.log(`  ${table}: ${(rows as unknown[]).length} rows`);
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
