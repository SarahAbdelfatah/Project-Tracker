import { generateId } from './projects';

const LEGACY_STORAGE_KEY = 'ae_project_tracker_v1';
const PREVIEW_DOCUMENT_KEY = 'ae_project_tracker_document_preview';

export function createEmptyDocument() {
  return {
    schemaVersion: 1,
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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

export function readLegacyProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadTrackerDocument() {
  if (window.projectTracker) return window.projectTracker.load();

  try {
    const previewDocument = JSON.parse(localStorage.getItem(PREVIEW_DOCUMENT_KEY) || 'null');
    if (previewDocument?.schemaVersion === 1 && Array.isArray(previewDocument.projects)) {
      return {
        document: previewDocument,
        storage: { mode: 'browser-preview', encrypted: false },
        recovery: { state: 'healthy' },
        isNew: false,
      };
    }
  } catch {
    // Fall through to the legacy projects-only store.
  }
  const document = createEmptyDocument();
  document.projects = readLegacyProjects();
  return {
    document,
    storage: { mode: 'browser-preview', encrypted: false },
    recovery: { state: 'healthy' },
    isNew: document.projects.length === 0,
  };
}

export async function saveTrackerDocument(document) {
  if (window.projectTracker) return window.projectTracker.save(document);
  localStorage.setItem(PREVIEW_DOCUMENT_KEY, JSON.stringify(document));
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(document.projects));
  return { document, storage: { mode: 'browser-preview', encrypted: false } };
}

export async function exportTrackerBackup() {
  if (!window.projectTracker) return { cancelled: true, reason: 'Use the Electron app to export a backup.' };
  return window.projectTracker.exportBackup();
}

export async function importTrackerBackup() {
  if (!window.projectTracker) return { cancelled: true, reason: 'Use the Electron app to import a backup.' };
  return window.projectTracker.importBackup();
}

export function createProject(document, values) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const id = generateId(document.projects);
  return {
    ...document,
    metadata: { ...document.metadata, updatedAt: new Date().toISOString() },
    projects: [{ ...values, id, created: today, updated: today }, ...document.projects],
    projectDetailsById: { ...document.projectDetailsById, [id]: { created: today, requirement: '', requirementFollowUp: '', inputs: [], bom: [], workflow: {} } },
  };
}
