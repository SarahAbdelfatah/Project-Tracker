import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  STAGES, BIDDING_PHASES, PROJECT_STATES,
} from './data/projects';
import {
  createEmptyDocument, createProject, exportTrackerBackup, importTrackerBackup,
  loadTrackerDocument, readLegacyProjects, saveTrackerDocument,
} from './data/tracker';
import './styles.css';

// ─── SVG icon set ─────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }) {
  const paths = {
    plus:       <path d="M12 5v14M5 12h14" />,
    search:     <><circle cx="10.5" cy="10.5" r="6" /><path d="m16 16 4 4" /></>,
    copy:       <><rect x="8" y="8" width="10" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" /></>,
    check:      <path d="M5 13l4 4L19 7" />,
    bell:       <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 22h4" /></>,
    sun:        <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    moon:       <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />,
    panel:      <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" /></>,
    chevron:    <path d="m9 18 6-6-6-6" />,
    arrowLeft:  <><path d="m14 6-6 6 6 6" /><path d="M8 12h12" /></>,
    filter:     <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    sort:       <><path d="M3 6h18M6 12h12M9 18h6" /></>,
    folder:     <><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></>,
    inbox:      <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
    settings:   <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    x:          <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
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

// ─── Status strip on each card ────────────────────────────────────────────────
function StatusStrip({ project }) {
  const stageInfo = STAGES[project.stage];

  // Non-bidding: just show stage pill + date
  if (project.stage !== 'bidding') {
    return (
      <div className="status-strip">
        <span className={`stage-pill ${project.stage}`}>{stageInfo.label}</span>
        <span className="strip-sep">·</span>
        <span className="strip-date">{project.updated}</span>
      </div>
    );
  }

  // Bidding stage: show full detail
  return (
    <div className="status-strip">
      <span className="stage-pill bidding">Bidding</span>
      <span className="strip-sep">›</span>
      <span className={`phase-tag ${project.phase?.toLowerCase()}`}>{project.phase}</span>
      <span className="strip-sep">›</span>
      <span className="step-label">{project.step}</span>
      <span className="strip-date">{project.updated}</span>
    </div>
  );
}

// ─── Individual project card ───────────────────────────────────────────────────
function ProjectCard({ project, onCopy, onOpen }) {
  const stateKey = project.state?.toLowerCase().replace(' ', '-');
  return (
    <article className="project-card">
      <div className="card-top">
        <div className="card-info">
          <div className="card-name">{project.name}</div>
          <div className="card-meta">
            <span className="card-client">{project.client}</span>
            <span className="meta-dot">·</span>
            <button
              className="opid-btn"
              onClick={() => onCopy(project.opid)}
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
          <button className="chevron-btn" onClick={() => onOpen(project.id)} aria-label={`Open ${project.name}`}>
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>
      <StatusStrip project={project} />
    </article>
  );
}

function ProjectDetailShell({ project, onBack, onCopy, toast, theme, onToggleTheme }) {
  return (
    <div className="app-shell detail-shell">
      <header className="topbar">
        <div className="topbar-left">
          <img className="app-mark" src={`${import.meta.env.BASE_URL}app-icon.png`} alt="Project Tracker" />
          <span className="app-wordmark">APPLICATION ENGINEERING<br /><strong>Project tracker</strong></span>
        </div>
        <div className="topbar-right">
          <button className="icon-btn theme-toggle" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button className="icon-btn" aria-label="Notifications"><Icon name="bell" size={16} /></button>
          <button className="avatar-btn" aria-label="Account menu">AE</button>
        </div>
      </header>
      <main className="detail-route-main">
        <button className="back-to-projects" onClick={onBack}>
          <Icon name="arrowLeft" size={15} /> Back to projects
        </button>
        <section className="detail-route-hero" aria-labelledby="detail-project-title">
          <span className={`stage-pill ${project.stage}`}>{STAGES[project.stage]?.label || 'Project'}</span>
          <h1 id="detail-project-title">{project.name}</h1>
          <dl className="detail-route-meta">
            <div><dt>Client / account</dt><dd>{project.client}</dd></div>
            <div>
              <dt>OPID</dt>
              <dd>
                <button className="detail-opid-button" onClick={() => onCopy(project.opid)} title={`Copy ${project.opid}`} aria-label={`Copy OPID ${project.opid}`}>
                  <span>{project.opid}</span><Icon name="copy" size={13} />
                </button>
              </dd>
            </div>
            <div><dt>Last updated</dt><dd>{project.updated}</dd></div>
          </dl>
        </section>
        <section className="detail-route-placeholder" aria-label="Project detail foundation">
          <h2>Project details</h2>
          <p>The editable project workspace will be added in the next approved phases. Your dashboard data is unchanged.</p>
        </section>
        {toast && (
          <div className="toast" role="status" aria-live="polite">
            <span className="toast-icon"><Icon name={toast.icon} size={13} /></span>
            {toast.msg}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Add / New project dialog ──────────────────────────────────────────────────
function AddProjectDialog({ onClose, onCreate }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
      <form className="dialog" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <p className="dialog-eyebrow">New Project</p>
          <h2 className="dialog-title">Add a project</h2>
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
              placeholder="e.g. Alexandria UPS Upgrade"
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
                placeholder="Client name"
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
                placeholder="OP-26-0000"
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
  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog data-tools-dialog" role="dialog" aria-modal="true" aria-labelledby="data-tools-title">
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

function RecoveryDialog({ onStartFresh, onImport }) {
  return (
    <div className="modal-backdrop recovery-backdrop">
      <section className="dialog recovery-dialog" role="alertdialog" aria-modal="true" aria-labelledby="recovery-title">
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

// ─── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [document, setDocument] = useState(null);
  const [storage, setStorage] = useState(null);
  const [recovery, setRecovery] = useState({ state: 'loading' });
  const [saveState, setSaveState] = useState('loading');
  const [filter, setFilter]     = useState('All');
  const [query, setQuery]       = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [showDataTools, setShowDataTools] = useState(false);
  const [dataToolMessage, setDataToolMessage] = useState('');
  const [toast, setToast]       = useState(null);
  const [route, setRoute]       = useState(() => window.location.hash);
  const saveQueue = useRef(Promise.resolve());

  const persistDocument = useCallback((nextDocument) => {
    setDocument(nextDocument);
    setSaveState('saving');
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => saveTrackerDocument(nextDocument))
      .then((result) => {
        setStorage(result.storage);
        setSaveState('saved');
      })
      .catch(() => setSaveState('save-error'));
    return saveQueue.current;
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
        let nextDocument = result.document;
        const legacyProjects = result.isNew ? readLegacyProjects() : [];
        if (legacyProjects.length) {
          nextDocument = { ...nextDocument, projects: legacyProjects };
          await saveTrackerDocument(nextDocument);
        }
        if (!active) return;
        setDocument(nextDocument);
        setStorage(result.storage);
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

  useEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme;
  }, [theme]);

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
    persistDocument(createProject(document, form));
    setShowAdd(false);
    setFilter('All');
    showToast('Project created');
  }, [document, persistDocument, showToast]);

  const handleExport = useCallback(async () => {
    const result = await exportTrackerBackup();
    setDataToolMessage(result.cancelled ? (result.reason || 'Export cancelled.') : 'Backup exported successfully.');
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const result = await importTrackerBackup();
      if (result.document) {
        setDocument(result.document);
        setStorage(result.storage);
        setRecovery({ state: 'healthy' });
        setSaveState('saved');
        setDataToolMessage('Backup restored successfully.');
        setShowAdd(false);
      } else {
        setDataToolMessage(result.reason || 'Import cancelled.');
      }
    } catch {
      setDataToolMessage('This backup could not be validated. Your current tracker was not changed.');
    }
  }, []);

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

  // Filtered list
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchState = filter === 'All' || p.state === filter;
      const search = `${p.name} ${p.client} ${p.opid}`.toLowerCase();
      return matchState && search.includes(query.toLowerCase());
    });
  }, [projects, filter, query]);

  const count = (state) =>
    state === 'All'
      ? projects.length
      : projects.filter((p) => p.state === state).length;

  const tabs = ['All', ...PROJECT_STATES];
  const detailId = route.startsWith('#/projects/') ? Number(route.split('/').pop()) : null;
  const detailProject = projects.find((project) => project.id === detailId);

  const openProject = (id) => {
    window.location.hash = `/projects/${id}`;
  };

  const returnToProjects = () => {
    window.location.hash = '';
  };

  if (detailProject) {
    return <ProjectDetailShell project={detailProject} onBack={returnToProjects} onCopy={copyOpid} toast={toast} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <div className="app-shell">
      {/* ── Topbar ─────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <img className="app-mark" src={`${import.meta.env.BASE_URL}app-icon.png`} alt="Project Tracker" />
          <span className="app-wordmark">APPLICATION ENGINEERING<br /><strong>Project tracker</strong></span>
        </div>

        <div className="topbar-right">
          <span className={`save-indicator ${saveState}`} title={storage?.encrypted ? 'Encrypted local storage' : 'Local storage'}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'save-error' ? 'Save failed' : saveState === 'recovery' ? 'Recovery needed' : 'Saved locally'}
          </span>
          <button className="icon-btn" onClick={() => { setDataToolMessage(''); setShowDataTools(true); }} aria-label="Data and backups" title="Data and backups">
            <Icon name="settings" size={16} />
          </button>
          <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button className="icon-btn" aria-label="Notifications">
            <Icon name="bell" size={16} />
          </button>
          <button className="avatar-btn" aria-label="Account menu">AE</button>
        </div>
      </header>

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
              <button className="filter-btn">
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
                className={`filter-tab ${filter === tab ? 'active' : ''}`}
                role="tab"
                aria-selected={filter === tab}
                onClick={() => setFilter(tab)}
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
              {filter === 'All' ? 'All projects' : `${filter} projects`}
            </span>
            <span className="section-count">{filtered.length} shown</span>
          </div>

          <div className="project-list" role="list" aria-label="Project list">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📂</span>
                {projects.length === 0
                  ? 'No projects yet. Hit "New project" to get started.'
                  : 'No projects match your search.'}
              </div>
            ) : (
              filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onCopy={copyOpid}
                  onOpen={openProject}
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

      {showDataTools && (
        <DataToolsDialog
          onClose={() => setShowDataTools(false)}
          onExport={handleExport}
          onImport={handleImport}
          message={dataToolMessage}
        />
      )}

      {recovery.state === 'needs-recovery' && (
        <RecoveryDialog onStartFresh={handleStartFresh} onImport={handleImport} />
      )}
    </div>
  );
}
