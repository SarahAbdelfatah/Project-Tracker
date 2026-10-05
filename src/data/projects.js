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

// Generate a unique numeric ID for new projects
export function generateId(existingProjects) {
  if (existingProjects.length === 0) return 1;
  return Math.max(...existingProjects.map((p) => p.id)) + 1;
}
