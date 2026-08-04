import { createSnapshot, restoreSnapshot, TABLES_PARENT_FIRST, SnapshotFile } from './db-snapshot';

function buildMockClient(callLog: string[], data: Record<string, unknown[]> = {}) {
  const client: any = {};
  for (const table of TABLES_PARENT_FIRST) {
    client[table] = {
      findMany: jest.fn(async () => {
        callLog.push(`findMany:${table}`);
        return data[table] ?? [];
      }),
      deleteMany: jest.fn(async () => {
        callLog.push(`deleteMany:${table}`);
      }),
      create: jest.fn(async (args: { data: any }) => {
        callLog.push(`create:${table}:${JSON.stringify(args.data)}`);
      }),
    };
  }
  return client;
}

describe('createSnapshot', () => {
  it('reads every table in parent-first order', async () => {
    const callLog: string[] = [];
    const client = buildMockClient(callLog);

    await createSnapshot(client);

    const findManyCalls = callLog.filter(c => c.startsWith('findMany:'));
    expect(findManyCalls).toEqual(TABLES_PARENT_FIRST.map(t => `findMany:${t}`));
  });

  it('produces a version 1 snapshot with a timestamp', async () => {
    const client = buildMockClient([]);
    const snapshot = await createSnapshot(client);
    expect(snapshot.version).toBe(1);
    expect(snapshot.createdAt).toBeTruthy();
    expect(new Date(snapshot.createdAt).toString()).not.toBe('Invalid Date');
  });
});

describe('restoreSnapshot', () => {
  it('DATA INTEGRITY: deletes in exactly the reverse order of creation', async () => {
    const callLog: string[] = [];
    const client = buildMockClient(callLog);
    const snapshot: SnapshotFile = { version: 1, createdAt: 'x', tables: {} };

    await restoreSnapshot(client, snapshot);

    const deleteCalls = callLog.filter(c => c.startsWith('deleteMany:')).map(c => c.split(':')[1]);
    const expectedReverse = [...TABLES_PARENT_FIRST].reverse();
    expect(deleteCalls).toEqual(expectedReverse);
  });

  it('creates in exactly parent-first order, and strictly after all deletes finish', async () => {
    const callLog: string[] = [];
    const client = buildMockClient(callLog);
    const snapshot: SnapshotFile = {
      version: 1,
      createdAt: 'x',
      tables: { student: [{ id: 's1' }], quiz: [{ id: 'q1' }] },
    };

    await restoreSnapshot(client, snapshot);

    const lastDeleteIndex = callLog.map((c, i) => (c.startsWith('deleteMany:') ? i : -1)).filter(i => i >= 0).pop()!;
    const firstCreateIndex = callLog.map((c, i) => (c.startsWith('create:') ? i : -1)).filter(i => i >= 0)[0]!;
    expect(firstCreateIndex).toBeGreaterThan(lastDeleteIndex);

    const createCalls = callLog.filter(c => c.startsWith('create:')).map(c => c.split(':')[1]);
    // student comes before quiz in TABLES_PARENT_FIRST -- confirm that order held.
    expect(createCalls.indexOf('student')).toBeLessThan(createCalls.indexOf('quiz'));
  });

  it('rejects a snapshot with an unrecognized version instead of silently restoring it wrong', async () => {
    const client = buildMockClient([]);
    const badSnapshot = { version: 2, createdAt: 'x', tables: {} } as unknown as SnapshotFile;
    await expect(restoreSnapshot(client, badSnapshot)).rejects.toThrow(/version/i);
  });

  it('ROUND TRIP: data backed up from one client is restored byte-for-byte into another', async () => {
    const sourceData = {
      student: [{ id: 's1', name: 'Ada', email: 'ada@example.com', status: 'VERIFIED' }],
      quiz: [{ id: 'q1', title: 'Test Quiz' }],
    };
    const sourceClient = buildMockClient([], sourceData);
    const snapshot = await createSnapshot(sourceClient);

    const restoreLog: string[] = [];
    const targetClient = buildMockClient(restoreLog);
    await restoreSnapshot(targetClient, snapshot);

    expect(targetClient.student.create).toHaveBeenCalledWith({ data: sourceData.student[0] });
    expect(targetClient.quiz.create).toHaveBeenCalledWith({ data: sourceData.quiz[0] });
  });
});
