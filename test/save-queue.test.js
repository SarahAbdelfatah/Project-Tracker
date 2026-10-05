import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveQueue } from '../src/data/save-queue.js';

test('rapid consecutive saves are written in submission order', async () => {
  const writes = [];
  const enqueue = createSaveQueue(async (document) => {
    await new Promise((resolve) => setTimeout(resolve, document.delay));
    writes.push(document.value);
    return document.value;
  });
  const saves = [
    enqueue({ value: 'first', delay: 20 }),
    enqueue({ value: 'second', delay: 0 }),
    enqueue({ value: 'third', delay: 0 }),
  ];
  assert.deepEqual(await Promise.all(saves), ['first', 'second', 'third']);
  assert.deepEqual(writes, ['first', 'second', 'third']);
});

test('a failed save does not block the next queued save', async () => {
  const writes = [];
  const enqueue = createSaveQueue(async (value) => {
    if (value === 'broken') throw new Error('disk unavailable');
    writes.push(value);
    return value;
  });
  await assert.rejects(enqueue('broken'), /disk unavailable/);
  assert.equal(await enqueue('recovered'), 'recovered');
  assert.deepEqual(writes, ['recovered']);
});
