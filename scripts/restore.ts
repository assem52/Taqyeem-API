import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as readline from 'readline';
import { restoreSnapshot, SnapshotFile, TABLES_PARENT_FIRST } from './db-snapshot';

const prisma = new PrismaClient();

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npx ts-node scripts/restore.ts <path-to-backup.json>');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`Backup file not found: ${file}`);
    process.exit(1);
  }

  const snapshot: SnapshotFile = JSON.parse(fs.readFileSync(file, 'utf-8'));

  console.log('This will DELETE all current data in these tables and replace it with the backup:');
  console.log('  ' + [...TABLES_PARENT_FIRST].reverse().join(', '));
  const ok = await confirm("Type 'yes' to continue, anything else to abort: ");
  if (!ok) {
    console.log('Aborted. Nothing was changed.');
    process.exit(0);
  }

  await restoreSnapshot(prisma as any, snapshot);
  console.log('Restore complete.');
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
