import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  STAGES, BIDDING_PHASES, PROJECT_STATES,
} from './data/projects';
import {
  createEmptyDocument, createProject, exportTrackerBackup, importTrackerBackup,
  loadTrackerDocument, saveTrackerDocument,
} from './data/tracker';
import { createSaveQueue } from './data/save-queue';
import './styles.css';

// ─── SVG icon set ─────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }) {
  const paths = {
    plus:       <path d="M12 5v14M5 12h14" />,
    search:     <><circle cx="10.5" cy="10.5" r="6" /><path d="m16 16 4 4" /></>,
    copy:       <><rect x="8" y="8" width="10" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" /></>,
    check:      <path d="M5 13l4 4L19 7" />,
    sun:        <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    moon:       <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />,
    chevron:    <path d="m9 18 6-6-6-6" />,
    chevronDown:<path d="m6 9 6 6 6-6" />,
    arrowLeft:  <><path d="m14 6-6 6 6 6" /><path d="M8 12h12" /></>,
    filter:     <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    folder:     <><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></>,
    inbox:      <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
    settings:   <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    trash:      <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></>,
    expand:     <><path d="M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7" /></>,
    edit:       <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    note:       <><path d="M5 3h11l3 3v15H5Z" /><path d="M8 8h7M8 12h7M8 16h4" /><path d="m15 3 1 4 3-1" /></>,
  };
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function AppTopbar({ saveState, storage, theme, onThemeToggle, onOpenDataTools }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <img className="app-mark" src={`${import.meta.env.BASE_URL}app-icon.png`} alt="Abdelfatah's Project Tracker" />
        <span className="app-wordmark">APPLICATION ENGINEERING<br /><strong>Abdelfatah&apos;s Project Tracker</strong></span>
      </div>
      <div className="topbar-right">
        <span className={`save-indicator ${saveState}`} title={storage?.encrypted ? 'Encrypted local storage' : 'Local storage'}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'save-error' ? 'Save failed' : saveState === 'recovery' ? 'Recovery needed' : 'Saved locally'}
        </span>
        <button className="icon-btn" onClick={onOpenDataTools} aria-label="Data and backups" title="Data and backups">
          <Icon name="settings" size={16} />
        </button>
        <button className="icon-btn theme-toggle" onClick={onThemeToggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
      </div>
    </header>
  );
}

const DIALOG_FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function useDialogAccessibility(onClose) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = globalThis.document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => {
      if (!dialog.contains(globalThis.document.activeElement)) dialog.querySelector(DIALOG_FOCUSABLE)?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll(DIALOG_FOCUSABLE)].filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && globalThis.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && globalThis.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      dialog.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return dialogRef;
}

const LEGACY_PLACEHOLDER_INPUT_LABELS = [
  'Single-line diagram', 'Critical load schedule', 'Electrical room layout', 'Required backup runtime', 'Site photos',
];

function isUntouchedDefaultInput(input) {
  return LEGACY_PLACEHOLDER_INPUT_LABELS.includes(input?.label)
    && !input?.received
    && (!input?.status || input.status === 'Awaiting' || input.status === 'Not provided');
}

function removeLegacyPlaceholderInputs(document) {
  let changed = false;
  const projectDetailsById = Object.fromEntries(Object.entries(document?.projectDetailsById || {}).map(([id, detail]) => {
    if (!Array.isArray(detail?.inputs)) return [id, detail];
    const inputs = detail.inputs.filter((input) => !isUntouchedDefaultInput(input));
    if (inputs.length === detail.inputs.length) return [id, detail];
    changed = true;
    return [id, { ...detail, inputs }];
  }));
  return changed ? { ...document, projectDetailsById } : document;
}

function emptyProjectDetail(project) {
  return {
    created: project?.created || project?.updated || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    requirement: '',
    requirementFollowUp: '',
    workflow: {},
    inputs: [],
    bom: [],
  };
}

function detailFor(project, detailsById) {
  const saved = detailsById?.[project.id];
  const fallback = emptyProjectDetail(project);
  const savedInputs = Array.isArray(saved?.inputs) ? saved.inputs.filter((input) => !isUntouchedDefaultInput(input)) : [];
  return {
    ...fallback,
    ...(saved || {}),
    inputs: savedInputs,
    bom: Array.isArray(saved?.bom) ? saved.bom : [],
    workflow: saved?.workflow && typeof saved.workflow === 'object' ? saved.workflow : {},
  };
}

// ─── Status strip on each card ────────────────────────────────────────────────
function StatusStrip({ project }) {
  const stageInfo = STAGES[project.stage];

  // Non-bidding: just show stage pill + date
  if (project.stage !== 'bidding') {
    return (
      <div className="status-strip">
        <span className={`stage-pill ${project.stage}`}>{stageInfo.label}</span>
        <span className="strip-date">{project.updated}</span>
      </div>
    );
  }

  // Bidding stage: show full detail
  return (
    <div className="status-strip">
      <span className="stage-pill bidding">Bidding</span>
      {project.phase && <><span className="strip-sep">›</span><span className={`phase-tag ${project.phase.toLowerCase()}`}>{project.phase}</span></>}
      {project.phase && project.step && <><span className="strip-sep">›</span><span className="step-label">{project.step}</span></>}
      <span className="strip-date">{project.updated}</span>
    </div>
  );
}

// ─── Individual project card ───────────────────────────────────────────────────
function ProjectCard({ project, details, onCopy, onOpen, onDelete }) {
  const stateKey = project.state?.toLowerCase().replace(' ', '-');
  const requirement = details?.requirement?.trim();
  const inCallReminder = details?.requirementFollowUp?.trim();
  const inputs = Array.isArray(details?.inputs) ? details.inputs : [];
  const receivedInputs = inputs.filter((input) => input.received).length;
  const inputStatus = inputs.length === 0
    ? 'No inputs listed'
    : receivedInputs === inputs.length
      ? `All ${inputs.length} inputs received`
      : `${receivedInputs} of ${inputs.length} received · Waiting for ${inputs.length - receivedInputs}`;
  return (
    <article className="project-card" tabIndex="0" onClick={() => onOpen(project.id)} onKeyDown={(event) => {
      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onOpen(project.id);
      }
    }}>
      <div className="card-top">
        <div className="card-info">
          <div className="card-name">{project.name}</div>
          <div className="card-meta">
            <span className="card-client">{project.client}</span>
            <span className="meta-dot">·</span>
            <button
              className="opid-btn"
              onClick={(event) => { event.stopPropagation(); onCopy(project.opid); }}
              title={`Copy ${project.opid}`}
              aria-label={`Copy OPID ${project.opid}`}
            >
              <span>{project.opid}</span>
              <Icon name="copy" size={11} />
            </button>
          </div>
        </div>
        <div className="card-badges">
          <span className={`state-badge ${stateKey}`}>{project.state}</span>
          <button className="chevron-btn" onClick={(event) => { event.stopPropagation(); onOpen(project.id); }} aria-label={`Open ${project.name}`}>
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>
      <div className="card-notes">
        <div><span>Project requirement</span><p className={requirement ? '' : 'empty'}>{requirement || 'No summary added'}</p></div>
        <div><span>In-call reminder</span><p className={inCallReminder ? '' : 'empty'}>{inCallReminder || 'No reminder added'}</p></div>
        <div className="card-input-summary"><span>Project inputs</span><p>{inputStatus}</p><button className="card-delete-btn" onClick={(event) => { event.stopPropagation(); onDelete(project); }} aria-label={`Delete ${project.name}`} title="Delete project"><Icon name="trash" size={14} /></button></div>
      </div>
      <StatusStrip project={project} />
    </article>
  );
}

function RequirementExpandDialog({ detail, onChange, onClose }) {
  const [draft, setDraft] = useState({ requirement: detail.requirement, requirementFollowUp: detail.requirementFollowUp || '' });
  const [editing, setEditing] = useState(false);
  const [editingField, setEditingField] = useState('requirement');
  const requirementRef = useRef(null);
  const followUpRef = useRef(null);
  const dialogRef = useDialogAccessibility(onClose);
  useEffect(() => {
    if (!editing) return;
    (editingField === 'followup' ? followUpRef : requirementRef).current?.focus();
  }, [editing, editingField]);
  const startEditing = (field) => { setEditingField(field); setEditing(true); };
  const keyboardEdit = (event, field) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); startEditing(field); }
  };
  const cancelEditing = () => {
    setDraft({ requirement: detail.requirement, requirementFollowUp: detail.requirementFollowUp || '' });
    setEditing(false);
  };
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="dialog ref-requirement-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-requirement-title"><div className="dialog-header"><h2 className="dialog-title" id="expanded-requirement-title">Project requirement</h2><p className="dialog-desc">{editing ? 'Editing note' : 'Full note view'}</p></div><div className="dialog-body">{editing ? <><textarea ref={requirementRef} maxLength={10000} value={draft.requirement} onChange={(event) => setDraft({ ...draft, requirement: event.target.value })} aria-label="Expanded project requirement" /><span className="ref-character-count">{draft.requirement.length.toLocaleString()} / 10,000</span><textarea ref={followUpRef} className="followup" maxLength={5000} value={draft.requirementFollowUp} onChange={(event) => setDraft({ ...draft, requirementFollowUp: event.target.value })} aria-label="Expanded requirement follow-up" /></> : <><div className="ref-requirement-preview" role="button" tabIndex="0" onClick={() => startEditing('requirement')} onKeyDown={(event) => keyboardEdit(event, 'requirement')} aria-label="Edit project requirement">{draft.requirement || <span>Add the project requirement…</span>}</div><div className="ref-requirement-preview followup" role="button" tabIndex="0" onClick={() => startEditing('followup')} onKeyDown={(event) => keyboardEdit(event, 'followup')} aria-label="Edit requirement follow-up">{draft.requirementFollowUp || <span>Add a follow-up note…</span>}</div></>}</div><div className="dialog-footer">{editing ? <><button className="btn-secondary" onClick={cancelEditing}>Cancel</button><button className="btn-primary" onClick={() => { onChange(draft, 'Updated project requirement'); onClose(); }}>Save note</button></> : <button className="btn-primary" onClick={onClose}>Done</button>}</div></section></div>;
}

function RequirementCard({ detail, onChange }) {
  const noteRef = useRef(null);
  const followUpRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const check = () => setOverflows([noteRef.current, followUpRef.current].some((element) => element && (element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2)));
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [detail.requirement, detail.requirementFollowUp]);
  return <section className="ref-card ref-requirement-card">
    <div className="ref-card-title-row"><div><h2>Project requirement</h2><p>Quick in-call reminder</p></div><button className="ref-note-button ref-expand-button" onClick={() => setExpanded(true)} aria-label="Open full project requirement editor" title="Open full editor"><Icon name={overflows ? 'expand' : 'note'} size={overflows ? 17 : 18} /></button></div>
    <textarea ref={noteRef} wrap="soft" maxLength={10000} className="ref-requirement-main" value={detail.requirement} onChange={(event) => onChange({ requirement: event.target.value }, null)} onBlur={(event) => onChange({ requirement: event.target.value }, 'Updated requirement note')} placeholder="Add the project requirement…" aria-label="Project requirement" />
    <textarea ref={followUpRef} wrap="soft" maxLength={5000} className="ref-requirement-followup" value={detail.requirementFollowUp || ''} onChange={(event) => onChange({ requirementFollowUp: event.target.value }, null)} onBlur={(event) => onChange({ requirementFollowUp: event.target.value }, 'Updated requirement follow-up')} placeholder="Add a follow-up note…" aria-label="Requirement follow-up" />
    {expanded && <RequirementExpandDialog detail={detail} onChange={onChange} onClose={() => setExpanded(false)} />}
  </section>;
}

function InputRows({ inputs, onChange, expanded = false }) {
  const updateInput = (id, patch) => onChange(inputs.map((input) => input.id === id ? { ...input, ...patch } : input));
  return <div className={`ref-input-list ${expanded ? 'expanded' : ''}`}>{inputs.length === 0 ? <div className="ref-input-empty"><Icon name="inbox" size={22} /><strong>No project inputs yet</strong><span>Use Add item to define what this project needs.</span></div> : inputs.map((input) => <label className="ref-input-row" key={input.id}>
    <input type="checkbox" checked={Boolean(input.received)} onChange={(event) => updateInput(input.id, { received: event.target.checked, status: event.target.checked ? 'Received' : 'Not provided' })} />
    <input className="ref-input-label" value={input.label} onChange={(event) => updateInput(input.id, { label: event.target.value })} aria-label="Project input label" placeholder="Input name" title={input.label || 'Unnamed input'} />
    <span className={input.received ? 'received' : ''}>{input.received ? 'Received' : input.status || 'Not provided'}</span>
    {expanded && <button type="button" className="ref-input-delete" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onChange(inputs.filter((candidate) => candidate.id !== input.id)); }} aria-label={`Delete ${input.label || 'project input'}`} title="Delete input"><Icon name="trash" size={13} /></button>}
  </label>)}</div>;
}

function InputsExpandDialog({ inputs, onChange, onClose }) {
  const addInput = () => onChange([...inputs, { id: `input-${Date.now()}`, label: '', received: false, status: 'Not provided' }]);
  const dialogRef = useDialogAccessibility(onClose);
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="dialog ref-inputs-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-inputs-title"><div className="dialog-header"><h2 className="dialog-title" id="expanded-inputs-title">Project inputs</h2><p className="dialog-desc">{inputs.filter((input) => input.received).length} of {inputs.length} received</p></div><div className="dialog-body ref-inputs-dialog-body"><div className="ref-inputs-dialog-actions"><span>Hover over an input to preview its full text.</span><button className="ref-dark-button" onClick={addInput}><Icon name="plus" size={14} /> Add item</button></div><InputRows inputs={inputs} onChange={onChange} expanded /></div><div className="dialog-footer"><button className="btn-primary" onClick={onClose}>Done</button></div></section></div>;
}

function InputsCard({ inputs, onChange }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="ref-card ref-inputs-card">
    <div className="ref-card-title-row"><div><h2>Project inputs</h2><p>{inputs.filter((input) => input.received).length} of {inputs.length} received</p></div><div className="ref-input-actions"><button className="ref-bom-expand-button" onClick={() => setExpanded(true)} aria-label="Expand project inputs" title="Open expanded project inputs"><Icon name="expand" size={15} /></button><button className="ref-outline-button" onClick={() => onChange([...inputs, { id: `input-${Date.now()}`, label: '', received: false, status: 'Not provided' }])}><Icon name="plus" size={14} /> Add item</button></div></div>
    <InputRows inputs={inputs} onChange={onChange} />
    {expanded && <InputsExpandDialog inputs={inputs} onChange={onChange} onClose={() => setExpanded(false)} />}
  </section>;
}

function BomRowsTable({ rows, onUpdate, onRemove, expanded = false }) {
  const headers = ['Row actions', 'Part number', 'Material description', 'Qty', 'Notes / status'];
  const minimumWidths = [64, 150, 260, 90, 200];
  const [columnWidths, setColumnWidths] = useState([72, 220, 520, 110, 360]);
  const resizeRef = useRef(null);
  const resizeColumn = (index, width) => setColumnWidths((current) => current.map((value, columnIndex) => columnIndex === index ? Math.max(minimumWidths[index], width) : value));
  const startResize = (event, index) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { index, startX: event.clientX, startWidth: columnWidths[index] };
  };
  const moveResize = (event) => {
    if (!resizeRef.current) return;
    resizeColumn(resizeRef.current.index, resizeRef.current.startWidth + event.clientX - resizeRef.current.startX);
  };
  const stopResize = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resizeRef.current = null;
  };
  const totalWidth = columnWidths.reduce((total, width) => total + width, 0);
  return <div className={`ref-bom-scroll ${expanded ? 'expanded' : ''}`}><table style={expanded ? { width: `${totalWidth}px`, minWidth: '100%' } : undefined}>{expanded && <colgroup>{columnWidths.map((width, index) => <col key={headers[index]} style={{ width: `${width}px` }} />)}</colgroup>}<thead><tr>{headers.map((header, index) => <th key={header} aria-label={index === 0 ? header : undefined}>{index === 0 ? null : header}{expanded && index > 0 && <span className="ref-column-resizer" role="separator" aria-label={`Resize ${header} column`} aria-orientation="vertical" tabIndex="0" onPointerDown={(event) => startResize(event, index)} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); resizeColumn(index, columnWidths[index] + (event.key === 'ArrowRight' ? 20 : -20)); } }} />}</th>)}</tr></thead><tbody>{rows.map((row) => <tr className={row.isNew ? 'ref-new-bom-row' : ''} key={row.id}><td><button className="ref-row-delete" onClick={() => onRemove(row.id)} aria-label={`Delete BOM row ${row.partNumber || ''}`}><Icon name="trash" size={14} /></button></td><td><input title={row.partNumber} value={row.partNumber} onChange={(event) => onUpdate(row.id, 'partNumber', event.target.value)} /></td><td><input title={row.description} value={row.description} onChange={(event) => onUpdate(row.id, 'description', event.target.value)} /></td><td><input title={row.quantity} value={row.quantity} onChange={(event) => onUpdate(row.id, 'quantity', event.target.value)} /></td><td><input title={row.notes} value={row.notes} onChange={(event) => onUpdate(row.id, 'notes', event.target.value)} /></td></tr>)}</tbody></table>{!rows.length && <p className="ref-bom-empty">Add a row or paste a tab-separated range from Excel.</p>}</div>;
}

function BomExpandDialog({ rows, onChange, onClose }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const dialogRef = useDialogAccessibility(onClose);
  const updateRow = (id, key, value) => onChange(rows.map((row) => row.id === id ? { ...row, [key]: value } : row), false);
  const removeRow = (id) => onChange(rows.filter((row) => row.id !== id), true);
  const addRow = () => onChange([...rows, { id: `bom-${Date.now()}`, partNumber: '', description: '', quantity: '', notes: '', isNew: true }], true);
  const applyPaste = () => {
    const parsed = paste.split(/\r?\n/).filter(Boolean).map((line, index) => {
      const [partNumber = '', description = '', quantity = '', notes = ''] = line.split('\t');
      return { id: `bom-${Date.now()}-${index}`, partNumber: partNumber.trim(), description: description.trim(), quantity: quantity.trim(), notes: notes.trim(), isNew: true };
    });
    if (parsed.length) onChange([...rows, ...parsed], true);
    setPaste(''); setPasteOpen(false);
  };
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="dialog ref-bom-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-bom-title"><div className="dialog-header"><h2 className="dialog-title" id="expanded-bom-title">Proposed BOM</h2><p className="dialog-desc">Expanded table view</p></div><div className="dialog-body ref-bom-dialog-body"><div className="ref-bom-dialog-actions"><span className="ref-column-resize-hint">↔ Drag column edges to resize</span><button className="ref-outline-button" onClick={() => setPasteOpen((open) => !open)}><Icon name="copy" size={14} /> Paste from Excel</button><button className="ref-dark-button" onClick={addRow}><Icon name="plus" size={14} /> Add row</button></div>{pasteOpen && <div className="ref-paste-row"><textarea autoFocus value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={'Part number\tDescription\tQty\tNotes'} /><button className="ref-dark-button" onClick={applyPaste}>Add pasted rows</button></div>}<BomRowsTable rows={rows} onUpdate={updateRow} onRemove={removeRow} expanded /></div><div className="dialog-footer"><button className="btn-primary" onClick={onClose}>Done</button></div></section></div>;
}

function BomCard({ rows, onChange }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const [expanded, setExpanded] = useState(false);
  const updateRow = (id, key, value) => onChange(rows.map((row) => row.id === id ? { ...row, [key]: value } : row), false);
  const removeRow = (id) => onChange(rows.filter((row) => row.id !== id), true);
  const addRow = () => onChange([...rows, { id: `bom-${Date.now()}`, partNumber: '', description: '', quantity: '', notes: '', isNew: true }], true);
  const applyPaste = () => {
    const parsed = paste.split(/\r?\n/).filter(Boolean).map((line, index) => {
      const [partNumber = '', description = '', quantity = '', notes = ''] = line.split('\t');
      return { id: `bom-${Date.now()}-${index}`, partNumber: partNumber.trim(), description: description.trim(), quantity: quantity.trim(), notes: notes.trim(), isNew: true };
    });
    if (parsed.length) onChange([...rows, ...parsed], true);
    setPaste(''); setPasteOpen(false);
  };
  return <section className="ref-card ref-bom-card">
    <div className="ref-bom-header"><div><h2>Proposed BOM</h2><p>Paste rows directly from Excel · tab and newline friendly</p></div><div><button className="ref-bom-expand-button" onClick={() => setExpanded(true)} aria-label="Expand proposed BOM" title="Open expanded BOM"><Icon name="expand" size={15} /></button><button className="ref-outline-button" onClick={() => setPasteOpen((open) => !open)}><Icon name="copy" size={14} /> Paste from Excel</button><button className="ref-dark-button" onClick={addRow}><Icon name="plus" size={14} /> Add row</button></div></div>
    {pasteOpen && <div className="ref-paste-row"><textarea autoFocus value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={'Part number\tDescription\tQty\tNotes'} /><button className="ref-dark-button" onClick={applyPaste}>Add pasted rows</button></div>}
    <BomRowsTable rows={rows} onUpdate={updateRow} onRemove={removeRow} />
    {expanded && <BomExpandDialog rows={rows} onChange={onChange} onClose={() => setExpanded(false)} />}
  </section>;
}

function StepDetailsDialog({ step, entry, onSave, onClose }) {
  const [date, setDate] = useState(entry?.date || new Date().toISOString().slice(0, 10));
  const [specs, setSpecs] = useState(entry?.specs || '');
  const dialogRef = useDialogAccessibility(onClose);
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="dialog ref-step-dialog" role="dialog" aria-modal="true" aria-labelledby="step-dialog-title"><div className="dialog-header"><h2 className="dialog-title" id="step-dialog-title">{step}</h2><p className="dialog-desc">Specifications are optional. The date defaults to today and can be corrected.</p></div><div className="dialog-body"><div className="field-group"><label className="field-label" htmlFor="step-update-date">Update date</label><input id="step-update-date" className="field-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="field-group"><label className="field-label" htmlFor="step-specs">Specifications</label><textarea id="step-specs" className="field-input ref-specs-input" value={specs} onChange={(event) => setSpecs(event.target.value)} placeholder="Add free-text specifications…" /></div></div><div className="dialog-footer"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { onSave({ date, specs }); onClose(); }}>Save</button></div></section></div>;
}

function ProjectStatusCard({ project, details, onWorkflowChange }) {
  const stageIndex = ['qualification', 'bidding', 'delivery'].indexOf(project.stage);
  const phases = Object.entries(BIDDING_PHASES);
  const allSteps = phases.flatMap(([phase, steps]) => steps.map((step) => ({ phase, step })));
  const currentStepIndex = allSteps.findIndex(({ step }) => step === project.step);
  const [editingStep, setEditingStep] = useState(null);
  const fallbackState = (index) => {
    if (project.stage === 'delivery') return 'complete';
    if (project.stage !== 'bidding') return 'upcoming';
    return index < currentStepIndex ? 'complete' : index === currentStepIndex ? 'current' : 'upcoming';
  };
  const stepState = (step, index) => details.workflow?.[step]?.status || fallbackState(index);
  const canActivate = (index) => stepState(allSteps[index].step, index) === 'upcoming' && (index === 0 || stepState(allSteps[index - 1].step, index - 1) === 'complete') && !allSteps.some(({ step }, stepIndex) => stepState(step, stepIndex) === 'current');
  const formatDate = (value) => {
    if (!value) return '';
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const today = () => new Date().toISOString().slice(0, 10);
  let offset = 0;
  return <section className="ref-card ref-status-card">
    <div className="ref-status-header"><div><p>Status / evidence</p><h2>Project status</h2></div><div><span>Last updated</span><strong>{project.updated}</strong></div></div>
    <div className="ref-timeline">
      <div className={`ref-major-step ${stageIndex > 0 ? 'complete' : 'current'}`}><span><Icon name="check" size={15} /></span><div><h3>Qualification stage</h3><p>{stageIndex > 0 ? 'Completed' : 'Current'} · {project.updated}</p></div>{stageIndex > 0 && <b>Completed</b>}</div>
      <div className={`ref-major-step ${project.stage === 'bidding' ? 'current' : stageIndex > 1 ? 'complete' : 'upcoming'}`}><span><Icon name="note" size={15} /></span><div><h3>Bidding Stage</h3><p>{project.stage === 'bidding' ? 'Current' : stageIndex > 1 ? 'Completed' : 'Upcoming'} · {project.updated}</p></div>{project.stage === 'bidding' && <b>Current</b>}</div>
      <div className="ref-phase-tree">{phases.map(([phase, steps]) => {
        const start = offset; offset += steps.length;
        return <div className="ref-phase" key={phase}><h4><i />{phase}</h4>{steps.map((step, index) => { const absoluteIndex = start + index; const state = stepState(step, absoluteIndex); const entry = details.workflow?.[step] || {}; const date = formatDate(entry.date) || (state !== 'upcoming' ? project.updated : ''); return <div className={`ref-substep ${state}`} key={step}><span>{state === 'complete' ? <Icon name="check" size={11} /> : state === 'current' ? <Icon name="note" size={11} /> : ''}</span><div className="ref-step-content"><div><strong>{step}</strong><p>{state === 'complete' ? 'Completed' : state === 'current' ? 'Current' : 'Upcoming'}{date ? ` · ${date}` : ''}</p></div><div className="ref-step-actions">{canActivate(absoluteIndex) && <button className="ref-activate-step" onClick={() => onWorkflowChange(phase, step, { status: 'current', date: today() }, { stage: 'bidding', phase, step }, `Activated ${step}`)}><Icon name="plus" size={11} /> Activate</button>}{state === 'current' && <button className="ref-complete-step" onClick={() => onWorkflowChange(phase, step, { status: 'complete', date: today() }, null, `Completed ${step}`)}><Icon name="check" size={11} /> Complete</button>}{state !== 'upcoming' && <div className="ref-step-specs"><button className="ref-specs-trigger" onClick={() => setEditingStep({ phase, step, entry })} aria-label={entry.specs ? `Edit specifications for ${step}` : `Add specifications for ${step}`}>{entry.specs ? 'Edit specs…' : 'Add specs…'}</button>{entry.specs && <p className="ref-specs-content">{entry.specs}</p>}</div>}</div></div></div>; })}</div>;
      })}</div>
      <div className={`ref-major-step delivery ${project.stage === 'delivery' ? 'current' : 'upcoming'}`}><span /><div><h3>Delivery Stage</h3><p>{project.stage === 'delivery' ? 'Current' : 'Upcoming'}</p></div></div>
    </div>
    {editingStep && <StepDetailsDialog step={editingStep.step} entry={details.workflow?.[editingStep.step] || editingStep.entry} onClose={() => setEditingStep(null)} onSave={(patch) => onWorkflowChange(editingStep.phase, editingStep.step, patch, null, `Updated ${editingStep.step} specifications`)} />}
  </section>;
}

function EditProjectDialog({ project, onSave, onClose }) {
  const [draft, setDraft] = useState({ name: project.name, client: project.client, opid: project.opid });
  const dialogRef = useDialogAccessibility(onClose);
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><form ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="edit-project-title" onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, opid: draft.opid.toUpperCase() }); onClose(); }}><div className="dialog-header"><h2 className="dialog-title" id="edit-project-title">Edit project</h2></div><div className="dialog-body"><div className="field-group"><label className="field-label">Project name</label><input className="field-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div><div className="two-col"><div className="field-group"><label className="field-label">Client / account</label><input className="field-input" value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value })} /></div><div className="field-group"><label className="field-label">OPID</label><input className="field-input" value={draft.opid} onChange={(event) => setDraft({ ...draft, opid: event.target.value })} /></div></div></div><div className="dialog-footer"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Save changes</button></div></form></div>;
}

function ProjectDetailShell({ project, details, saveState, storage, theme, onThemeToggle, onOpenDataTools, onBack, onCopy, toast, onProjectChange, onDetailChange, onWorkflowChange }) {
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const handleBackspace = (event) => {
      if (event.key !== 'Backspace' || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      const isEditingText = target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      const dialogOpen = globalThis.document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (isEditingText || dialogOpen) return;
      event.preventDefault();
      onBack();
    };
    window.addEventListener('keydown', handleBackspace);
    return () => window.removeEventListener('keydown', handleBackspace);
  }, [onBack]);
  return <div className="app-shell ref-detail-shell">
    <AppTopbar saveState={saveState} storage={storage} theme={theme} onThemeToggle={onThemeToggle} onOpenDataTools={onOpenDataTools} />
    <main className="ref-detail-main">
      <button className="ref-back" onClick={onBack}><Icon name="arrowLeft" size={15} /> Back to projects</button>
      <section className="ref-hero"><div className="ref-hero-title"><div><span className={`stage-pill ${project.stage}`}>{STAGES[project.stage]?.label || 'Project'}</span></div><span className="ref-editable-value"><h1>{project.name}</h1><button className="ref-inline-edit" onClick={() => setEditing(true)} aria-label="Edit project name"><Icon name="edit" size={13} /></button></span></div><dl><div><dt>Client / account</dt><dd><span>{project.client}</span><button className="ref-inline-edit" onClick={() => setEditing(true)} aria-label="Edit client account"><Icon name="edit" size={12} /></button></dd></div><div><dt>OPID</dt><dd>{project.opid}<button onClick={() => onCopy(project.opid)} aria-label={`Copy OPID ${project.opid}`}><Icon name="copy" size={13} /></button><button className="ref-inline-edit" onClick={() => setEditing(true)} aria-label="Edit OPID"><Icon name="edit" size={12} /></button></dd></div><div><dt>Created</dt><dd>{details.created}</dd></div></dl></section>
      <div className="ref-detail-grid"><div className="ref-left-column"><div className="ref-upper-row"><InputsCard inputs={details.inputs} onChange={(inputs) => onDetailChange({ inputs }, 'Updated project inputs')} /><RequirementCard detail={details} onChange={onDetailChange} /></div><BomCard rows={details.bom} onChange={(bom, audit) => onDetailChange({ bom }, audit ? 'Updated proposed BOM' : null)} /></div><ProjectStatusCard project={project} details={details} onWorkflowChange={onWorkflowChange} /></div>
      {toast && <div className="toast" role="status" aria-live="polite"><span className="toast-icon"><Icon name={toast.icon} size={13} /></span>{toast.msg}</div>}
    </main>
    {editing && <EditProjectDialog project={project} onClose={() => setEditing(false)} onSave={(patch) => onProjectChange(patch, 'Updated project details')} />}
  </div>;
}

// ─── Add / New project dialog ──────────────────────────────────────────────────
function AddProjectDialog({ onClose, onCreate }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dialogRef = useDialogAccessibility(onClose);

  const [form, setForm] = useState({
    name: '',
    client: '',
    opid: '',
    state: 'Active',
    stage: 'qualification',
    phase: '',
    step: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Reset phase/step when stage changes
  const handleStageChange = (val) => {
    setForm((f) => ({ ...f, stage: val, phase: '', step: '' }));
  };

  // Reset step when phase changes
  const handlePhaseChange = (val) => {
    setForm((f) => ({ ...f, phase: val, step: '' }));
  };

  const isValid = form.name.trim() && form.client.trim() && form.opid.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onCreate({
      ...form,
      name:    form.name.trim(),
      client:  form.client.trim(),
      opid:    form.opid.trim().toUpperCase(),
      updated: today,
    });
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const phaseOptions = Object.keys(BIDDING_PHASES);
  const stepOptions  = form.phase ? BIDDING_PHASES[form.phase] : [];

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <form ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="add-project-title" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <p className="dialog-eyebrow">New Project</p>
          <h2 className="dialog-title" id="add-project-title">Add a project</h2>
          <p className="dialog-desc">
            Start with the essentials. You can update the status anytime.
          </p>
        </div>

        <div className="dialog-body">
          {/* Project name */}
          <div className="field-group">
            <label className="field-label" htmlFor="new-name">
              Project name <span>*</span>
            </label>
            <input
              id="new-name"
              className="field-input"
              autoFocus
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Client / OPID in two columns */}
          <div className="two-col">
            <div className="field-group">
              <label className="field-label" htmlFor="new-client">
                Client / Account <span>*</span>
              </label>
              <input
                id="new-client"
                className="field-input"
                required
                value={form.client}
                onChange={(e) => set('client', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="new-opid">
                OPID <span>*</span>
              </label>
              <input
                id="new-opid"
                className="field-input"
                required
                value={form.opid}
                onChange={(e) => set('opid', e.target.value)}
              />
            </div>
          </div>

          {/* State / Stage */}
          <div className="two-col">
            <div className="field-group">
              <label className="field-label" htmlFor="new-state">State</label>
              <select
                id="new-state"
                className="field-select"
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
              >
                {PROJECT_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="new-stage">Stage</label>
              <select
                id="new-stage"
                className="field-select"
                value={form.stage}
                onChange={(e) => handleStageChange(e.target.value)}
              >
                {Object.entries(STAGES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bidding phase & step — only shown when stage = bidding */}
          {form.stage === 'bidding' && (
            <div className="two-col">
              <div className="field-group">
                <label className="field-label" htmlFor="new-phase">Phase</label>
                <select
                  id="new-phase"
                  className="field-select"
                  value={form.phase}
                  onChange={(e) => handlePhaseChange(e.target.value)}
                >
                  <option value="">— Select phase —</option>
                  {phaseOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="new-step">Step</label>
                <select
                  id="new-step"
                  className="field-select"
                  value={form.step}
                  onChange={(e) => set('step', e.target.value)}
                  disabled={!form.phase}
                >
                  <option value="">— Select step —</option>
                  {stepOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!isValid}>
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}

function DataToolsDialog({ onClose, onExport, onImport, message }) {
  const dialogRef = useDialogAccessibility(onClose);
  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="dialog data-tools-dialog" role="dialog" aria-modal="true" aria-labelledby="data-tools-title">
        <div className="dialog-header">
          <h2 className="dialog-title" id="data-tools-title">Data & backups</h2>
          <p className="dialog-desc">Export a portable backup or restore a previously exported tracker file.</p>
        </div>
        <div className="dialog-body data-tools-body">
          <button className="data-tool-option" onClick={onExport}><strong>Export backup</strong><span>Save a readable JSON copy of your tracker.</span></button>
          <button className="data-tool-option" onClick={onImport}><strong>Import backup</strong><span>Replace this tracker with a validated backup file.</span></button>
          {message && <p className="data-tool-message" role="status">{message}</p>}
        </div>
        <div className="dialog-footer"><button className="btn-secondary" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}

function DeleteProjectDialog({ project, onClose, onConfirm }) {
  const dialogRef = useDialogAccessibility(onClose);
  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="dialog delete-project-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" aria-describedby="delete-project-description">
        <div className="dialog-header">
          <p className="dialog-eyebrow">Delete project</p>
          <h2 className="dialog-title" id="delete-project-title">Erase “{project.name}”?</h2>
          <p className="dialog-desc" id="delete-project-description">This permanently removes the project, its requirements, inputs, BOM, workflow details, and activity history. This cannot be undone.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={() => onConfirm(project)}><Icon name="trash" size={14} /> Delete project</button>
        </div>
      </section>
    </div>
  );
}

function RecoveryDialog({ onStartFresh, onImport }) {
  const dialogRef = useDialogAccessibility(null);
  return (
    <div className="modal-backdrop recovery-backdrop">
      <section ref={dialogRef} className="dialog recovery-dialog" role="alertdialog" aria-modal="true" aria-labelledby="recovery-title">
        <div className="dialog-header">
          <p className="dialog-eyebrow">Recovery needed</p>
          <h2 className="dialog-title" id="recovery-title">Your tracker file could not be safely read</h2>
          <p className="dialog-desc">The app did not load damaged data. Restore a valid exported backup or start a clean tracker.</p>
        </div>
        <div className="dialog-footer recovery-actions">
          <button className="btn-secondary" onClick={onImport}>Import backup</button>
          <button className="btn-primary" onClick={onStartFresh}>Start clean tracker</button>
        </div>
      </section>
    </div>
  );
}

const DEFAULT_DASHBOARD_FILTERS = { focus: 'all', state: 'all', stage: 'all', phase: 'all', client: 'all', inputs: 'all', content: 'all', age: 'all', sort: 'recent' };

function FilterField({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef(null);
  const triggerRef = useRef(null);
  const selected = options.find(([optionValue]) => optionValue === value) || options[0];

  const focusOption = (position) => {
    window.requestAnimationFrame(() => {
      const optionButtons = [...(fieldRef.current?.querySelectorAll('[role="option"]') || [])];
      if (!optionButtons.length) return;
      const selectedIndex = Math.max(0, options.findIndex(([optionValue]) => optionValue === value));
      const targetIndex = position === 'last' ? optionButtons.length - 1 : position === 'selected' ? selectedIndex : 0;
      optionButtons[targetIndex]?.focus();
    });
  };

  const openFromKeyboard = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
    focusOption(event.key === 'ArrowUp' || event.key === 'End' ? 'last' : event.key === 'Home' ? 'first' : 'selected');
  };

  const handleMenuKeyDown = (event) => {
    const optionButtons = [...(fieldRef.current?.querySelectorAll('[role="option"]') || [])];
    const activeIndex = optionButtons.indexOf(globalThis.document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !optionButtons.length) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? optionButtons.length - 1
        : event.key === 'ArrowDown' ? (activeIndex + 1 + optionButtons.length) % optionButtons.length
          : (activeIndex - 1 + optionButtons.length) % optionButtons.length;
    optionButtons[nextIndex]?.focus();
  };

  useEffect(() => {
    const closeWhenOutside = (event) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target)) setOpen(false);
    };
    globalThis.document.addEventListener('mousedown', closeWhenOutside);
    return () => globalThis.document.removeEventListener('mousedown', closeWhenOutside);
  }, []);

  return (
    <div className="filter-field" ref={fieldRef}>
      <span>{label}</span>
      <button ref={triggerRef} className={`filter-select-trigger ${open ? 'open' : ''}`} onClick={() => setOpen((isOpen) => !isOpen)} onKeyDown={openFromKeyboard} aria-haspopup="listbox" aria-expanded={open}>
        <span>{selected[1]}</span><Icon name="chevronDown" size={15} />
      </button>
      {open && (
        <div className="filter-select-menu" role="listbox" aria-label={label} onKeyDown={handleMenuKeyDown}>
          {options.map(([optionValue, optionLabel]) => (
            <button key={optionValue} className={optionValue === value ? 'selected' : ''} role="option" aria-selected={optionValue === value} tabIndex={optionValue === value ? 0 : -1} onClick={() => { onChange(optionValue); setOpen(false); triggerRef.current?.focus(); }}>
              {optionLabel}{optionValue === value && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FiltersDialog({ filters, clients, onChange, onClear, onClose }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });
  const dialogRef = useDialogAccessibility(onClose);
  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="dialog filters-dialog" role="dialog" aria-modal="true" aria-labelledby="filters-title">
        <div className="dialog-header filters-header">
          <div><h2 className="dialog-title" id="filters-title">Find the right project</h2><p className="dialog-desc">Combine a focus view with precise filters and sorting.</p></div>
          <button className="text-button" onClick={onClear}>Clear all</button>
        </div>
        <div className="dialog-body filters-body">
          <div className="focus-grid" role="group" aria-label="Focus views">
            {[
              ['all', 'All projects'], ['follow-up', 'Needs follow-up'], ['waiting', 'Waiting on client'], ['blocked', 'Blocked'],
              ['qualification', 'Qualification'], ['proposing', 'Proposing'], ['execution', 'Execution'], ['delivery', 'Delivery'],
              ['missing-inputs', 'Missing inputs'], ['missing-bom', 'Missing BOM'], ['recent', 'Recently updated'],
            ].map(([value, label]) => <button key={value} className={`focus-option ${filters.focus === value ? 'active' : ''}`} onClick={() => set('focus', value)}>{label}</button>)}
          </div>
          <div className="filter-grid">
            <FilterField label="Project state" value={filters.state} onChange={(value) => set('state', value)} options={[['all', 'Any state'], ...PROJECT_STATES.map((state) => [state, state])]} />
            <FilterField label="Workflow stage" value={filters.stage} onChange={(value) => set('stage', value)} options={[['all', 'Any stage'], ...Object.entries(STAGES).map(([key, stage]) => [key, stage.label])]} />
            <FilterField label="Bidding group" value={filters.phase} onChange={(value) => set('phase', value)} options={[['all', 'Any group'], ['Proposing', 'Proposing'], ['Execution', 'Execution']]} />
            <FilterField label="Client / account" value={filters.client} onChange={(value) => set('client', value)} options={[['all', 'Any client'], ...clients.map((client) => [client, client])]} />
            <FilterField label="Project inputs" value={filters.inputs} onChange={(value) => set('inputs', value)} options={[['all', 'Any coverage'], ['complete', 'All received'], ['missing', 'Missing inputs']]} />
            <FilterField label="Project content" value={filters.content} onChange={(value) => set('content', value)} options={[['all', 'Any content'], ['requirement', 'Has requirement'], ['bom', 'Has BOM'], ['missing-bom', 'Missing BOM']]} />
            <FilterField label="Last update" value={filters.age} onChange={(value) => set('age', value)} options={[['all', 'Any time'], ['1', 'Today'], ['3', 'Last 3 days'], ['7', 'Last 7 days'], ['14', 'Last 14 days'], ['30', 'Last 30 days']]} />
            <FilterField label="Sort by" value={filters.sort} onChange={(value) => set('sort', value)} options={[['recent', 'Recently updated'], ['oldest', 'Oldest update'], ['newest', 'Newest project'], ['created', 'Oldest project'], ['project-az', 'Project A–Z'], ['client-az', 'Client A–Z'], ['workflow', 'Workflow order'], ['inputs', 'Least-complete inputs']]} />
          </div>
        </div>
        <div className="dialog-footer"><button className="btn-primary" onClick={onClose}>Show projects</button></div>
      </section>
    </div>
  );
}

// ─── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [document, setDocument] = useState(null);
  const [storage, setStorage] = useState(null);
  const [recovery, setRecovery] = useState({ state: 'loading' });
  const [saveState, setSaveState] = useState('loading');
  const [query, setQuery]       = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDataTools, setShowDataTools] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [dataToolMessage, setDataToolMessage] = useState('');
  const [toast, setToast]       = useState(null);
  const [route, setRoute]       = useState(() => window.location.hash);
  const saveQueue = useRef(null);
  const saveRevision = useRef(0);
  if (!saveQueue.current) saveQueue.current = createSaveQueue(saveTrackerDocument);

  const persistDocument = useCallback((nextDocument) => {
    const revision = ++saveRevision.current;
    setDocument(nextDocument);
    setSaveState('saving');
    return saveQueue.current(nextDocument)
      .then((result) => {
        setStorage(result.storage);
        if (revision === saveRevision.current) {
          if (result.document) setDocument(result.document);
          setSaveState('saved');
        }
        return result;
      })
      .catch((error) => {
        if (revision === saveRevision.current) setSaveState('save-error');
        return { error };
      });
  }, []);

  useEffect(() => {
    let active = true;
    async function initialise() {
      try {
        const result = await loadTrackerDocument();
        if (!active) return;
        if (!result.document) {
          setRecovery(result.recovery);
          setSaveState('recovery');
          return;
        }
        const nextDocument = removeLegacyPlaceholderInputs(result.document);
        let nextStorage = result.storage;
        if (nextDocument !== result.document) {
          const saved = await saveTrackerDocument(nextDocument);
          nextStorage = saved.storage;
        }
        if (!active) return;
        setDocument(nextDocument);
        setStorage(nextStorage);
        setRecovery(result.recovery);
        setSaveState('saved');
      } catch {
        if (active) {
          setRecovery({ state: 'needs-recovery' });
          setSaveState('recovery');
        }
      }
    }
    initialise();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const projects = document?.projects || [];
  const theme = document?.preferences?.theme === 'dark' ? 'dark' : 'light';
  const dashboardFilters = { ...DEFAULT_DASHBOARD_FILTERS, ...(document?.preferences?.dashboard || {}) };

  useEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme;
  }, [theme]);

  const updateDashboardFilters = useCallback((nextFilters) => {
    if (!document) return;
    persistDocument({
      ...document,
      preferences: { ...document.preferences, dashboard: { ...DEFAULT_DASHBOARD_FILTERS, ...nextFilters } },
    });
  }, [document, persistDocument]);

  // Toast helper — auto‑dismisses after 2 s
  const showToast = useCallback((msg, icon = 'check') => {
    setToast({ msg, icon });
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  // Copy OPID to clipboard
  const copyOpid = useCallback(async (opid) => {
    try {
      await navigator.clipboard.writeText(opid);
      showToast(`${opid} copied`, 'copy');
    } catch {
      showToast(`Copy: ${opid}`, 'copy');
    }
  }, [showToast]);

  // Create project
  const handleCreate = useCallback((form) => {
    if (!document) return;
    const nextDocument = createProject(document, form);
    persistDocument({
      ...nextDocument,
      preferences: {
        ...nextDocument.preferences,
        dashboard: { ...DEFAULT_DASHBOARD_FILTERS, ...(nextDocument.preferences?.dashboard || {}), focus: 'all', state: 'all' },
      },
    });
    setShowAdd(false);
    showToast('Project created');
  }, [document, persistDocument, showToast]);

  const handleDeleteProject = useCallback((project) => {
    if (!document) return;
    const projectDetailsById = { ...(document.projectDetailsById || {}) };
    const activityByProjectId = { ...(document.activityByProjectId || {}) };
    delete projectDetailsById[project.id];
    delete activityByProjectId[project.id];
    persistDocument({
      ...document,
      projects: document.projects.filter((candidate) => candidate.id !== project.id),
      projectDetailsById,
      activityByProjectId,
    });
    setProjectToDelete(null);
    showToast('Project deleted', 'trash');
  }, [document, persistDocument, showToast]);

  const handleExport = useCallback(async () => {
    const result = await exportTrackerBackup();
    setDataToolMessage(result.cancelled ? (result.reason || 'Export cancelled.') : 'Backup exported successfully.');
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const result = await importTrackerBackup();
      if (result.document) {
        await persistDocument(removeLegacyPlaceholderInputs(result.document));
        setRecovery({ state: 'healthy' });
        setDataToolMessage('Backup restored successfully.');
        setShowAdd(false);
      } else {
        setDataToolMessage(result.reason || 'Import cancelled.');
      }
    } catch {
      setDataToolMessage('This backup could not be validated. Your current tracker was not changed.');
    }
  }, [persistDocument]);

  const handleStartFresh = useCallback(() => {
    const fresh = createEmptyDocument();
    setRecovery({ state: 'healthy' });
    persistDocument(fresh);
  }, [persistDocument]);

  const toggleTheme = useCallback(() => {
    if (!document) return;
    persistDocument({
      ...document,
      preferences: { ...document.preferences, theme: theme === 'dark' ? 'light' : 'dark' },
    });
  }, [document, persistDocument, theme]);

  const addActivity = useCallback((nextDocument, projectId, action) => {
    if (!action) return nextDocument;
    const now = new Date();
    const event = { id: `activity-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`, action, timestamp: now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) };
    return { ...nextDocument, activityByProjectId: { ...nextDocument.activityByProjectId, [projectId]: [event, ...(nextDocument.activityByProjectId?.[projectId] || [])] } };
  }, []);

  const updateProjectDetail = useCallback((projectId, patch, action) => {
    if (!document) return;
    const project = document.projects.find((item) => item.id === projectId);
    if (!project) return;
    const next = {
      ...document,
      projectDetailsById: { ...document.projectDetailsById, [projectId]: { ...detailFor(project, document.projectDetailsById), ...patch } },
    };
    persistDocument(addActivity(next, projectId, action));
  }, [addActivity, document, persistDocument]);

  const updateProjectSummary = useCallback((projectId, patch, action) => {
    if (!document) return;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const next = { ...document, projects: document.projects.map((item) => item.id === projectId ? { ...item, ...patch, updated: today } : item) };
    persistDocument(addActivity(next, projectId, action));
  }, [addActivity, document, persistDocument]);

  const updateWorkflowStep = useCallback((projectId, phase, step, stepPatch, projectPatch, action) => {
    if (!document) return;
    const project = document.projects.find((item) => item.id === projectId);
    if (!project) return;
    const currentDetail = detailFor(project, document.projectDetailsById);
    const next = {
      ...document,
      projects: projectPatch ? document.projects.map((item) => item.id === projectId ? { ...item, ...projectPatch, updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } : item) : document.projects,
      projectDetailsById: {
        ...document.projectDetailsById,
        [projectId]: {
          ...currentDetail,
          workflow: { ...currentDetail.workflow, [step]: { ...(currentDetail.workflow?.[step] || {}), ...stepPatch, phase } },
        },
      },
    };
    persistDocument(addActivity(next, projectId, action));
  }, [addActivity, document, persistDocument]);

  // Filtered list
  const filtered = useMemo(() => {
    const now = Date.now();
    const detailsById = document?.projectDetailsById || {};
    const activityByProjectId = document?.activityByProjectId || {};
    const updateTime = (project) => Date.parse(project.updated) || 0;
    const inputsFor = (detail) => Array.isArray(detail?.inputs) ? detail.inputs : [];
    const hasAllInputs = (detail) => inputsFor(detail).length > 0 && inputsFor(detail).every((input) => input.received);
    const hasBom = (detail) => Array.isArray(detail?.bom) && detail.bom.length > 0;
    const searchText = (project, detail) => [project.name, project.client, project.opid, project.stage, project.phase, project.step, detail?.requirement, ...(detail?.bom || []).flatMap((row) => [row.partNumber, row.description]), ...(activityByProjectId[project.id] || []).map((event) => event.evidence)].filter(Boolean).join(' ').toLowerCase();
    const matchesFocus = (project, detail) => {
      const age = now - updateTime(project);
      const evidence = `${project.step || ''} ${(activityByProjectId[project.id] || []).map((event) => event.evidence || '').join(' ')}`.toLowerCase();
      if (dashboardFilters.focus === 'follow-up') return age > 7 * 86400000;
      if (dashboardFilters.focus === 'waiting') return evidence.includes('waiting') || evidence.includes('awaiting');
      if (dashboardFilters.focus === 'blocked') return evidence.includes('blocked') || project.state === 'On Hold';
      if (dashboardFilters.focus === 'qualification') return project.stage === 'qualification';
      if (dashboardFilters.focus === 'proposing') return project.phase === 'Proposing';
      if (dashboardFilters.focus === 'execution') return project.phase === 'Execution';
      if (dashboardFilters.focus === 'delivery') return project.stage === 'delivery';
      if (dashboardFilters.focus === 'missing-inputs') return !hasAllInputs(detail);
      if (dashboardFilters.focus === 'missing-bom') return !hasBom(detail);
      if (dashboardFilters.focus === 'recent') return age <= 7 * 86400000;
      return true;
    };
    const result = projects.filter((project) => {
      const detail = detailsById[project.id] || {};
      const age = now - updateTime(project);
      const matchState = dashboardFilters.state === 'all' || project.state === dashboardFilters.state;
      const matchStage = dashboardFilters.stage === 'all' || project.stage === dashboardFilters.stage;
      const matchPhase = dashboardFilters.phase === 'all' || project.phase === dashboardFilters.phase;
      const matchClient = dashboardFilters.client === 'all' || project.client === dashboardFilters.client;
      const matchInputs = dashboardFilters.inputs === 'all' || (dashboardFilters.inputs === 'complete' ? hasAllInputs(detail) : !hasAllInputs(detail));
      const matchContent = dashboardFilters.content === 'all' || (dashboardFilters.content === 'requirement' ? Boolean(detail.requirement?.trim()) : dashboardFilters.content === 'bom' ? hasBom(detail) : !hasBom(detail));
      const matchAge = dashboardFilters.age === 'all' || age <= Number(dashboardFilters.age) * 86400000;
      return matchState && matchStage && matchPhase && matchClient && matchInputs && matchContent && matchAge && matchesFocus(project, detail) && searchText(project, detail).includes(query.toLowerCase());
    });
    const workflowRank = { qualification: 0, bidding: 1, delivery: 2 };
    return result.sort((left, right) => {
      const leftDetail = detailsById[left.id] || {}; const rightDetail = detailsById[right.id] || {};
      if (dashboardFilters.sort === 'oldest') return updateTime(left) - updateTime(right);
      if (dashboardFilters.sort === 'newest') return right.id - left.id;
      if (dashboardFilters.sort === 'created') return left.id - right.id;
      if (dashboardFilters.sort === 'project-az') return left.name.localeCompare(right.name);
      if (dashboardFilters.sort === 'client-az') return left.client.localeCompare(right.client);
      if (dashboardFilters.sort === 'workflow') return (workflowRank[left.stage] - workflowRank[right.stage]) || left.name.localeCompare(right.name);
      if (dashboardFilters.sort === 'inputs') return Number(hasAllInputs(leftDetail)) - Number(hasAllInputs(rightDetail));
      return updateTime(right) - updateTime(left);
    });
  }, [dashboardFilters, document, projects, query]);

  const count = (state) =>
    state === 'All'
      ? projects.length
      : projects.filter((p) => p.state === state).length;

  const tabs = ['All', ...PROJECT_STATES];
  const clients = useMemo(() => [...new Set(projects.map((project) => project.client).filter(Boolean))].sort(), [projects]);
  const activeFilterChips = [
    dashboardFilters.focus !== 'all' && ['focus', dashboardFilters.focus.replaceAll('-', ' ')],
    dashboardFilters.state !== 'all' && ['state', dashboardFilters.state],
    dashboardFilters.stage !== 'all' && ['stage', STAGES[dashboardFilters.stage]?.label],
    dashboardFilters.phase !== 'all' && ['phase', dashboardFilters.phase],
    dashboardFilters.client !== 'all' && ['client', dashboardFilters.client],
    dashboardFilters.inputs !== 'all' && ['inputs', dashboardFilters.inputs === 'complete' ? 'all inputs received' : 'missing inputs'],
    dashboardFilters.content !== 'all' && ['content', dashboardFilters.content.replaceAll('-', ' ')],
    dashboardFilters.age !== 'all' && ['age', `updated ${dashboardFilters.age}d`],
  ].filter(Boolean);
  const detailId = route.startsWith('#/projects/') ? Number(route.split('/').pop()) : null;
  const detailProject = projects.find((project) => project.id === detailId);

  const openProject = (id) => {
    window.location.hash = `/projects/${id}`;
  };

  const returnToProjects = () => {
    window.location.hash = '';
  };

  if (detailProject) {
    return <><ProjectDetailShell project={detailProject} details={detailFor(detailProject, document?.projectDetailsById)} saveState={saveState} storage={storage} theme={theme} onThemeToggle={toggleTheme} onOpenDataTools={() => { setDataToolMessage(''); setShowDataTools(true); }} onBack={returnToProjects} onCopy={copyOpid} toast={toast} onProjectChange={(patch, action) => updateProjectSummary(detailProject.id, patch, action)} onDetailChange={(patch, action) => updateProjectDetail(detailProject.id, patch, action)} onWorkflowChange={(phase, step, stepPatch, projectPatch, action) => updateWorkflowStep(detailProject.id, phase, step, stepPatch, projectPatch, action)} />{showDataTools && <DataToolsDialog onClose={() => setShowDataTools(false)} onExport={handleExport} onImport={handleImport} message={dataToolMessage} />}</>;
  }

  return (
    <div className="app-shell">
      {/* ── Topbar ─────────────────────────────────────────────── */}
      <AppTopbar saveState={saveState} storage={storage} theme={theme} onThemeToggle={toggleTheme} onOpenDataTools={() => { setDataToolMessage(''); setShowDataTools(true); }} />

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="main">
        {/* Page header */}
        <div className="page-header">
          <p className="page-eyebrow">Application Engineering</p>
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Projects</h1>
              <p className="page-meta">
                <strong>{projects.length}</strong> total ·{' '}
                <strong>{count('Active')}</strong> active ·{' '}
                <strong>{count('Closed')}</strong> closed
              </p>
            </div>
            <div className="page-actions">
              <div className="page-search">
                <Icon name="search" size={14} />
                <input
                  id="global-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, client, or OPID…"
                  aria-label="Search projects"
                />
                <kbd>Ctrl K</kbd>
              </div>
              <button className="filter-btn" onClick={() => setShowFilters(true)}>
                <Icon name="filter" size={13} />
                Filters
              </button>
              <button
                className="new-project-btn"
                onClick={() => setShowAdd(true)}
                id="btn-new-project"
                disabled={!document}
              >
                <Icon name="plus" size={14} />
                New project
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="filter-tabs" role="tablist" aria-label="Filter projects">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`filter-tab ${(tab === 'All' ? dashboardFilters.state === 'all' : dashboardFilters.state === tab) ? 'active' : ''}`}
                role="tab"
                aria-selected={tab === 'All' ? dashboardFilters.state === 'all' : dashboardFilters.state === tab}
                onClick={() => updateDashboardFilters({ ...dashboardFilters, state: tab === 'All' ? 'all' : tab })}
              >
                {tab}
                <span>{count(tab)}</span>
              </button>
            ))}
          </div>

        </div>

        {/* Project list */}
        <div className="projects-section">
          <div className="section-label-row">
            <span className="section-label">
              {dashboardFilters.focus !== 'all' ? dashboardFilters.focus.replaceAll('-', ' ') : dashboardFilters.state === 'all' ? 'All projects' : `${dashboardFilters.state} projects`}
            </span>
            <span className="section-count">{filtered.length} shown</span>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="active-filter-chips" aria-label="Active filters">
              {activeFilterChips.map(([key, label]) => <button key={key} className="active-filter-chip" onClick={() => updateDashboardFilters({ ...dashboardFilters, [key]: 'all' })}>{label} <span>×</span></button>)}
              <button className="clear-filter-chips" onClick={() => updateDashboardFilters(DEFAULT_DASHBOARD_FILTERS)}>Clear all</button>
            </div>
          )}

          <div className="project-list" role="list" aria-label="Project list">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <Icon name={projects.length === 0 ? 'folder' : 'search'} size={30} />
                <strong>{projects.length === 0 ? 'No projects yet' : 'No matching projects'}</strong>
                <p>{projects.length === 0 ? 'Create your first project to start tracking requirements, inputs, BOMs, and delivery progress.' : 'Try changing the search text or clearing the active filters.'}</p>
                {projects.length === 0
                  ? <button className="btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> New project</button>
                  : <button className="btn-secondary" onClick={() => { setQuery(''); updateDashboardFilters(DEFAULT_DASHBOARD_FILTERS); }}>Clear search and filters</button>}
              </div>
            ) : (
              filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  details={detailFor(project, document.projectDetailsById)}
                  onCopy={copyOpid}
                  onOpen={openProject}
                  onDelete={setProjectToDelete}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className="toast-icon"><Icon name={toast.icon} size={13} /></span>
          {toast.msg}
        </div>
      )}

      {/* ── New project dialog ──────────────────────────────────── */}
      {showAdd && (
        <AddProjectDialog
          onClose={() => setShowAdd(false)}
          onCreate={handleCreate}
        />
      )}

      {projectToDelete && (
        <DeleteProjectDialog
          project={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onConfirm={handleDeleteProject}
        />
      )}

      {showDataTools && (
        <DataToolsDialog
          onClose={() => setShowDataTools(false)}
          onExport={handleExport}
          onImport={handleImport}
          message={dataToolMessage}
        />
      )}

      {showFilters && (
        <FiltersDialog
          filters={dashboardFilters}
          clients={clients}
          onChange={updateDashboardFilters}
          onClear={() => updateDashboardFilters(DEFAULT_DASHBOARD_FILTERS)}
          onClose={() => setShowFilters(false)}
        />
      )}

      {recovery.state === 'needs-recovery' && (
        <RecoveryDialog onStartFresh={handleStartFresh} onImport={handleImport} />
      )}
    </div>
  );
}
