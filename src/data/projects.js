// ─── Stage hierarchy ────────────────────────────────────────────────────────
export const STAGES = {
  qualification: { label: 'Qualification Stage', color: 'qualification' },
  bidding:       { label: 'Bidding Stage',        color: 'bidding'       },
  delivery:      { label: 'Delivery',             color: 'delivery'      },
};

// Bidding stage sub-phases and their ordered steps
export const BIDDING_PHASES = {
  Proposing: [
    'UPS Sizing',
    'Battery Sizing',
    'ETO Quotation',
    'BOM Release',
    'Price Approval',
    'Compliance',
    'Offer Release',
  ],
  Execution: [
    'Price Negotiation',
    'Closing',
    'P/O',
    'ATO Submittal',
    'FAT',
  ],
};

// Project states
export const PROJECT_STATES = ['Active', 'Closed', 'On Hold'];

// ─── LocalStorage persistence ────────────────────────────────────────────────
const STORAGE_KEY = 'ae_project_tracker_v1';

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage', e);
  }
}

// Generate a unique numeric ID for new projects
export function generateId(existingProjects) {
  if (existingProjects.length === 0) return 1;
  return Math.max(...existingProjects.map((p) => p.id)) + 1;
}
