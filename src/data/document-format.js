function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value, label, { required = false, max = 500, trim = true } = {}) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${label} must be text.`);
    return '';
  }
  const clean = trim ? value.trim() : value;
  if (required && !clean.trim()) throw new Error(`${label} is required.`);
  if (clean.length > max) throw new Error(`${label} is too long.`);
  return clean;
}

function snapshot(value, label) {
  if (!isPlainObject(value)) return undefined;
  const encoded = JSON.stringify(value);
  if (encoded.length > 20000) throw new Error(`${label} is too large.`);
  return JSON.parse(encoded);
}

function validateProject(project, index, ids) {
  if (!isPlainObject(project)) throw new Error(`Project ${index + 1} is invalid.`);
  const id = Number(project.id);
  if (!Number.isSafeInteger(id) || id < 1 || ids.has(id)) throw new Error(`Project ${index + 1} has an invalid ID.`);
  ids.add(id);
  return {
    id,
    name: text(project.name, 'Project name', { required: true }),
    client: text(project.client, 'Client', { required: true }),
    opid: text(project.opid, 'OPID', { required: true, max: 120 }).toUpperCase(),
    state: ['Active', 'Closed', 'On Hold'].includes(project.state) ? project.state : 'Active',
    stage: ['qualification', 'bidding', 'delivery'].includes(project.stage) ? project.stage : 'qualification',
    phase: text(project.phase, 'Phase', { max: 120 }),
    step: text(project.step, 'Step', { max: 160 }),
    created: text(project.created, 'Created date', { max: 120 }),
    updated: text(project.updated, 'Updated date', { max: 120 }) || new Date().toLocaleDateString('en-US'),
  };
}

function validateProjectDetails(value, validIds) {
  if (!isPlainObject(value)) return {};
  const output = {};
  for (const [rawId, detail] of Object.entries(value)) {
    const id = Number(rawId);
    if (!validIds.has(id) || !isPlainObject(detail)) continue;
    const inputs = Array.isArray(detail.inputs) ? detail.inputs.slice(0, 100).map((input, index) => ({
      id: text(input?.id, `Input ${index + 1} ID`, { max: 120 }) || `input-${index + 1}`,
      label: text(input?.label, `Input ${index + 1} label`, { max: 300 }) || 'Project input',
      received: Boolean(input?.received),
      status: text(input?.status, `Input ${index + 1} status`, { max: 120 }),
    })) : [];
    const bom = Array.isArray(detail.bom) ? detail.bom.slice(0, 2000).map((row, index) => ({
      id: text(row?.id, `BOM row ${index + 1} ID`, { max: 120 }) || `bom-${index + 1}`,
      partNumber: text(row?.partNumber, `BOM row ${index + 1} part number`, { max: 180 }),
      description: text(row?.description, `BOM row ${index + 1} description`, { max: 1000 }),
      quantity: text(row?.quantity, `BOM row ${index + 1} quantity`, { max: 80 }),
      notes: text(row?.notes, `BOM row ${index + 1} notes`, { max: 1000 }),
      isNew: Boolean(row?.isNew),
    })) : [];
    const workflow = {};
    if (isPlainObject(detail.workflow)) {
      for (const [step, entry] of Object.entries(detail.workflow).slice(0, 100)) {
        if (!isPlainObject(entry)) continue;
        const cleanStep = text(step, 'Workflow step', { max: 180 });
        if (!cleanStep) continue;
        workflow[cleanStep] = {
          status: ['upcoming', 'current', 'complete'].includes(entry.status) ? entry.status : 'upcoming',
          date: text(entry.date, `${cleanStep} date`, { max: 40 }),
          specs: text(entry.specs, `${cleanStep} specifications`, { max: 10000 }),
        };
      }
    }
    output[id] = {
      created: text(detail.created, 'Project created date', { max: 120 }),
      requirement: text(detail.requirement, 'Project requirement', { max: 10000, trim: false }),
      requirementFollowUp: text(detail.requirementFollowUp, 'Project requirement follow-up', { max: 5000, trim: false }),
      inputs,
      bom,
      workflow,
    };
  }
  return output;
}

function validateActivity(value, validIds) {
  if (!isPlainObject(value)) return {};
  const output = {};
  for (const [rawId, events] of Object.entries(value)) {
    const id = Number(rawId);
    if (!validIds.has(id) || !Array.isArray(events)) continue;
    output[id] = events.slice(0, 5000).filter(isPlainObject).map((event, index) => ({
      id: text(event.id, `Activity ${index + 1} ID`, { max: 120 }) || `activity-${index + 1}`,
      action: text(event.action, `Activity ${index + 1} action`, { max: 500 }) || 'Project updated',
      timestamp: text(event.timestamp, `Activity ${index + 1} timestamp`, { max: 160 }) || new Date().toLocaleString('en-US'),
      ...(event.evidence == null ? {} : { evidence: text(event.evidence, `Activity ${index + 1} evidence`, { max: 10000 }) }),
      ...(event.oldState == null ? {} : { oldState: snapshot(event.oldState, `Activity ${index + 1} old state`) }),
      ...(event.newState == null ? {} : { newState: snapshot(event.newState, `Activity ${index + 1} new state`) }),
      projectId: id,
    }));
  }
  return output;
}

export function createEmptyDocument() {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    metadata: { createdAt: now, updatedAt: now },
    preferences: {
      theme: 'light',
      sidebarCollapsed: false,
      dashboard: { focus: 'all', state: 'all', stage: 'all', phase: 'all', client: 'all', inputs: 'all', content: 'all', age: 'all', sort: 'recent' },
    },
    projects: [],
    projectDetailsById: {},
    activityByProjectId: {},
  };
}

export function validateDocument(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || !Array.isArray(value.projects)) {
    throw new Error('The tracker data format is not recognised.');
  }
  if (value.projects.length > 10000) throw new Error('The tracker contains too many projects.');
  const ids = new Set();
  const metadata = isPlainObject(value.metadata) ? value.metadata : {};
  const preferences = isPlainObject(value.preferences) ? value.preferences : {};
  const dashboard = isPlainObject(preferences.dashboard) ? preferences.dashboard : {};
  const projects = value.projects.map((project, index) => validateProject(project, index, ids));
  return {
    schemaVersion: 1,
    metadata: {
      createdAt: text(metadata.createdAt, 'Created date', { max: 80 }) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    preferences: {
      theme: preferences.theme === 'dark' ? 'dark' : 'light',
      sidebarCollapsed: Boolean(preferences.sidebarCollapsed),
      dashboard: {
        focus: text(dashboard.focus, 'Dashboard focus', { max: 60 }) || 'all',
        state: text(dashboard.state, 'Dashboard state', { max: 60 }) || 'all',
        stage: text(dashboard.stage, 'Dashboard stage', { max: 60 }) || 'all',
        phase: text(dashboard.phase, 'Dashboard phase', { max: 60 }) || 'all',
        client: text(dashboard.client, 'Dashboard client', { max: 300 }) || 'all',
        inputs: text(dashboard.inputs, 'Dashboard inputs', { max: 60 }) || 'all',
        content: text(dashboard.content, 'Dashboard content', { max: 60 }) || 'all',
        age: text(dashboard.age, 'Dashboard age', { max: 60 }) || 'all',
        sort: text(dashboard.sort, 'Dashboard sort', { max: 60 }) || 'recent',
      },
    },
    projects,
    projectDetailsById: validateProjectDetails(value.projectDetailsById, ids),
    activityByProjectId: validateActivity(value.activityByProjectId, ids),
  };
}

export function createBackupExport(document, exportedAt = new Date().toISOString()) {
  return {
    exportVersion: 1,
    exportedAt,
    document: validateDocument(document),
  };
}

export function documentFromBackup(value) {
  return validateDocument(isPlainObject(value) && value.document ? value.document : value);
}

export { isPlainObject };
