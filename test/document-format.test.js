import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupExport, createEmptyDocument, documentFromBackup, validateDocument } from '../src/data/document-format.js';

function populatedDocument() {
  const document = createEmptyDocument();
  document.projects = [{
    id: 7,
    name: 'UPS replacement',
    client: 'North plant',
    opid: 'op-7',
    state: 'Active',
    stage: 'bidding',
    phase: 'Proposing',
    step: 'Battery Sizing',
    created: 'Jan 2, 2026',
    updated: 'Jan 4, 2026',
  }];
  document.projectDetailsById = {
    7: {
      created: 'Jan 2, 2026',
      requirement: 'Support the critical load.',
      requirementFollowUp: 'Confirm autonomy.',
      inputs: [{ id: 'input-1', label: 'Load schedule', received: true, status: 'Received' }],
      bom: [{ id: 'bom-1', partNumber: 'UPS-1', description: 'UPS', quantity: '1', notes: 'Approved' }],
      workflow: { 'Battery Sizing': { status: 'current', date: '2026-01-04', specs: '30 minutes' } },
    },
  };
  document.activityByProjectId = {
    7: [{ id: 'event-1', action: 'Updated battery sizing', timestamp: 'Jan 4, 2026, 9:30 AM', evidence: '30 minutes' }],
  };
  return document;
}

test('empty documents contain no projects or mock records', () => {
  const document = createEmptyDocument();
  assert.deepEqual(document.projects, []);
  assert.deepEqual(document.projectDetailsById, {});
  assert.deepEqual(document.activityByProjectId, {});
});

test('validation preserves existing dashboard projects and their created date', () => {
  const source = populatedDocument();
  source.projects.push({
    ...source.projects[0],
    id: 8,
    name: 'Generator coordination',
    opid: 'op-8',
  });
  const clean = validateDocument(source);
  assert.equal(clean.projects.length, source.projects.length);
  assert.deepEqual(clean.projects.map((project) => project.id), [7, 8]);
  assert.equal(clean.projects[0].created, 'Jan 2, 2026');
  assert.equal(clean.projects[0].opid, 'OP-7');
  assert.equal(clean.projectDetailsById[7].requirement, 'Support the critical load.');
  assert.equal(clean.activityByProjectId[7][0].evidence, '30 minutes');
});

test('malformed documents are rejected without producing an empty replacement', () => {
  assert.throws(() => validateDocument({ projects: [] }), /not recognised/);
  assert.throws(() => validateDocument({ schemaVersion: 1, projects: [{ id: 1 }] }), /Project name/);
});

test('project requirements preserve spaces while a user is typing', () => {
  const source = populatedDocument();
  source.projectDetailsById[7].requirement = 'Keep this space ';
  source.projectDetailsById[7].requirementFollowUp = 'Then continue typing ';

  const clean = validateDocument(source);

  assert.equal(clean.projectDetailsById[7].requirement, 'Keep this space ');
  assert.equal(clean.projectDetailsById[7].requirementFollowUp, 'Then continue typing ');
});

test('export and import round-trip preserves every project', () => {
  const source = populatedDocument();
  const exported = createBackupExport(source, '2026-10-05T10:00:00.000Z');
  const restored = documentFromBackup(JSON.parse(JSON.stringify(exported)));

  assert.equal(exported.exportVersion, 1);
  assert.equal(exported.exportedAt, '2026-10-05T10:00:00.000Z');
  assert.deepEqual(restored.projects.map(({ id, name }) => ({ id, name })), [{ id: 7, name: 'UPS replacement' }]);
  assert.equal(restored.projectDetailsById[7].bom[0].partNumber, 'UPS-1');
});

test('import accepts a direct tracker document and rejects a malformed backup', () => {
  assert.equal(documentFromBackup(populatedDocument()).projects.length, 1);
  assert.throws(() => documentFromBackup({ exportVersion: 1, document: { projects: [] } }), /not recognised/);
});
