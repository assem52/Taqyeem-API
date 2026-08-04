export const TABLES_PARENT_FIRST = [
  'student',
  'quiz',
  'document',
  'enrollment',
  'question',
  'chunk',
  'quizOption',
  'attempt',
  'integrityEvent',
  'extension',
] as const;

export type TableName = (typeof TABLES_PARENT_FIRST)[number];

export interface SnapshotFile {
  version: 1;
  createdAt: string;
  tables: Record<string, unknown[]>;
}

/** Minimal shape this needs from a Prisma client — real or mocked. */
export interface SnapshotCapableClient {
  [table: string]: {
    findMany: () => Promise<unknown[]>;
    deleteMany: () => Promise<unknown>;
    create: (args: { data: unknown }) => Promise<unknown>;
  };
}

export async function createSnapshot(client: SnapshotCapableClient): Promise<SnapshotFile> {
  const tables: Record<string, unknown[]> = {};
  for (const table of TABLES_PARENT_FIRST) {
    tables[table] = await client[table].findMany();
  }
  return { version: 1, createdAt: new Date().toISOString(), tables };
}

export async function restoreSnapshot(
  client: SnapshotCapableClient,
  snapshot: SnapshotFile,
): Promise<void> {
  if (snapshot.version !== 1) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`);
  }

  const deleteOrder = [...TABLES_PARENT_FIRST].reverse();
  for (const table of deleteOrder) {
    await client[table].deleteMany();
  }

  for (const table of TABLES_PARENT_FIRST) {
    const rows = snapshot.tables[table] ?? [];
    for (const row of rows) {
      await client[table].create({ data: row });
    }
  }
}
