import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  STAGES, BIDDING_PHASES, PROJECT_STATES,
  loadProjects, saveProjects, generateId,
} from './data/projects';
import './styles.css';

// ─── SVG icon set ─────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }) {
  const paths = {
    plus:       <path d="M12 5v14M5 12h14" />,
    search:     <><circle cx="10.5" cy="10.5" r="6" /><path d="m16 16 4 4" /></>,
    copy:       <><rect x="8" y="8" width="10" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" /></>,
    check:      <path d="M5 13l4 4L19 7" />,
    bell:       <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 22h4" /></>,
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

function ProjectDetailShell({ project, onBack }) {
  return (
    <div className="app-shell detail-shell">
      <header className="topbar">
        <div className="topbar-left">
          <img className="app-mark" src={`${import.meta.env.BASE_URL}app-icon.png`} alt="Project Tracker" />
          <span className="app-wordmark">APPLICATION ENGINEERING<br /><strong>Project tracker</strong></span>
        </div>
        <div className="topbar-right">
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
            <div><dt>OPID</dt><dd>{project.opid}</dd></div>
            <div><dt>Last updated</dt><dd>{project.updated}</dd></div>
          </dl>
        </section>
        <section className="detail-route-placeholder" aria-label="Project detail foundation">
          <h2>Project details</h2>
          <p>The editable project workspace will be added in the next approved phases. Your dashboard data is unchanged.</p>
        </section>
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

// ─── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  // Load from localStorage on first render
  const [projects, setProjects] = useState(() => loadProjects());
  const [filter, setFilter]     = useState('All');
  const [query, setQuery]       = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [route, setRoute]       = useState(() => window.location.hash);

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  // Persist whenever projects change
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

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
    const newProject = { ...form, id: generateId(projects) };
    const updated = [newProject, ...projects];
    setProjects(updated);
    setShowAdd(false);
    setFilter('All');
    showToast('Project created');
  }, [projects, showToast]);

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
    return <ProjectDetailShell project={detailProject} onBack={returnToProjects} />;
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
          <button className="icon-btn" aria-label="Notifications">
            <Icon name="bell" size={16} />
          </button>
          <button className="avatar-btn" aria-label="Account menu">AE</button>
        </div>
      </header>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <nav className="sidebar" aria-label="Main navigation">
        <p className="nav-section-label">Main</p>
        <button className="nav-item active" aria-current="page">
          <Icon name="folder" size={15} />
          Projects
          <span className="nav-badge">{projects.length}</span>
        </button>
        <button className="nav-item">
          <Icon name="inbox" size={15} />
          Inbox
        </button>

        <p className="nav-section-label" style={{ marginTop: 12 }}>Status</p>
        {PROJECT_STATES.map((s) => (
          <button
            key={s}
            className={`nav-item ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            <span
              className="nav-status-dot"
              style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: s === 'Active' ? 'var(--col-active)'
                  : s === 'Closed' ? 'var(--col-closed)'
                  : 'var(--col-hold)',
              }}
            />
            {s}
            <span className="nav-badge">{count(s)}</span>
          </button>
        ))}

        <div className="sidebar-footer">
          <button className="nav-item">
            <Icon name="settings" size={15} />
            Settings
          </button>
        </div>
      </nav>

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

          <div className="toolbar-gap" />

          <button className="sort-btn">
            <Icon name="sort" size={13} />
            Sort
          </button>
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
    </div>
  );
}
