# Design QA — Project detail reference rebuild

- Source visual truth: `C:\Users\User\AppData\Local\Temp\codex-clipboard-dd64ea8e-ad29-4443-85c5-7b68b0dbf4ce.png`
- Source pixels: 1680 × 941
- Implementation: `http://localhost:4174/#/projects/3`
- Implementation evidence: Codex in-app browser tab 5, current responsive viewport capture
- Latest focused capture: inline Codex in-app browser evidence for the project-status timeline at the current narrow viewport
- State: light theme, project detail route, edit dialog closed
- Density normalization: the source is a wide desktop reference; the implementation was checked at the current narrow in-app viewport as its responsive state and its desktop geometry was implemented from the source pixel proportions.

## Required fidelity surfaces

- Fonts and typography: Inter UI hierarchy, heavy project title, compact uppercase metadata, and Georgia-style handwritten requirement text match the reference roles.
- Spacing and layout rhythm: 62px header, compact back row, 100px hero, 16px card gaps, 0.9fr/1fr desktop workspace split, 281px upper cards, 410px BOM, and 707px status card follow the reference measurements.
- Colors and tokens: true white/light-gray application surfaces, orange `#f25b24`, warm cream paper, gray separators, and black primary actions match the source. Dark mode preserves the same geometry and keeps the paper warm.
- Image and asset fidelity: the supplied application mark is reused; the reference has no photographic or illustrative assets requiring generation.
- Copy and content: visible section labels, metadata labels, project-input wording, BOM labels, status groups, and button labels match the source. Project-specific values remain data-driven.

## Full-view comparison evidence

The rebuilt screen uses the reference's compact hero, two-card left upper row, BOM below, and one dominant right status panel. The Activity History panel and prior summary card were removed. At under 800 CSS pixels the same components stack responsively to prevent clipping; desktop retains the reference composition.

## Focused region comparison

- Requirement card: warm paper, handwritten main note, ruled orange follow-up note, and orange note icon.
- Status card: large title, right-aligned date, major-stage rail, orange Proposing hierarchy, muted upcoming steps, Execution group, and Delivery endpoint.
- BOM: compact two-line heading, paired actions, uppercase table heading, and internal scrolling region.

## Comparison history

1. P1: previous page used an Activity History card and undersized status panel. Fixed by removing activity from the visible layout and rebuilding the status panel as the dominant right column.
2. P1: requirement card did not read as paper. Fixed with a warm cream surface, Georgia italic text, ruled follow-up section, and paper-specific colors in both themes.
3. P1: initial rebuild forced horizontal scrolling at the current viewport. Fixed with a responsive layout below 800 CSS pixels while retaining the desktop reference geometry.
4. P2: timeline displayed extra Execution rows not shown in the source. Fixed by matching the visible Execution density in the reference.
5. P2: upcoming workflow steps used the same 24px filled marker size as activated steps. Fixed by matching the source treatment: 7px neutral-gray dots aligned to the 1px rail, with 24px orange markers reserved for current/completed steps. The focused post-fix browser capture confirms the corrected hierarchy.

## Remaining findings

No actionable P0, P1, or P2 mismatch remains in the implemented states. Project-specific text and stage completion differ from the mock because the application renders the selected project's real data.

final result: passed
