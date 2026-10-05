import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readFirstValidFile, rotateBackupsAndReplace } from '../src/data/storage-core.js';

async function withTemporaryDirectory(run) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'project-tracker-test-'));
  try {
    await run(folder);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
}

test('atomic replacement keeps rotating recovery backups', async () => {
  await withTemporaryDirectory(async (folder) => {
    const dataPath = path.join(folder, 'tracker.json');
    const temporaryPath = path.join(folder, 'tracker.tmp');
    const backupPath = (number) => path.join(folder, `tracker.json.backup-${number}`);
    await fs.writeFile(dataPath, 'current');
    await fs.writeFile(backupPath(1), 'older');
    await fs.writeFile(backupPath(2), 'oldest');
    await fs.writeFile(temporaryPath, 'new');

    await rotateBackupsAndReplace({ dataPath, temporaryPath, backupPath, backupCount: 3 });

    assert.equal(await fs.readFile(dataPath, 'utf8'), 'new');
    assert.equal(await fs.readFile(backupPath(1), 'utf8'), 'current');
    assert.equal(await fs.readFile(backupPath(2), 'utf8'), 'older');
    assert.equal(await fs.readFile(backupPath(3), 'utf8'), 'oldest');
  });
});

test('a failed replacement restores the previous main file', async () => {
  await withTemporaryDirectory(async (folder) => {
    const dataPath = path.join(folder, 'tracker.json');
    const missingTemporaryPath = path.join(folder, 'missing.tmp');
    const backupPath = (number) => path.join(folder, `tracker.json.backup-${number}`);
    await fs.writeFile(dataPath, 'safe-current');

    await assert.rejects(rotateBackupsAndReplace({ dataPath, temporaryPath: missingTemporaryPath, backupPath, backupCount: 3 }));
    assert.equal(await fs.readFile(dataPath, 'utf8'), 'safe-current');
  });
});

test('malformed primary data falls back to the first valid backup', async () => {
  await withTemporaryDirectory(async (folder) => {
    const primary = path.join(folder, 'tracker.json');
    const backup = path.join(folder, 'tracker.json.backup-1');
    await fs.writeFile(primary, '{broken');
    await fs.writeFile(backup, JSON.stringify({ projects: [1, 2, 3] }));

    const result = await readFirstValidFile([primary, backup], JSON.parse);
    assert.equal(result.index, 1);
    assert.deepEqual(result.value, { projects: [1, 2, 3] });
    assert.equal(result.failures.length, 1);
  });
});
