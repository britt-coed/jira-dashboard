import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend,
} from 'recharts'
import { useJiraIssues } from '../hooks/useJiraIssues'

// ── Colours ─────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  'To Do':       '#e2e8f0',
  'In Progress': '#3b82f6',
  'In Review':   '#f59e0b',
  'Done':        '#22c55e',
  'Blocked':     '#ef4444',
}

const PRIORITY_DOT = {
  Highest: { color: '#ef4444' },
  High:    { color: '#f97316' },
  Medium:  { color: '#eab308' },
  Low:     { color: '#3b82f6' },
  Lowest:  { color: '#94a3b8' },
}

// ── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'All OQS requests',   jql: 'labels = "oqs-requests" ORDER BY updated DESC' },
  { label: 'Open',               jql: 'labels = "oqs-requests" AND statusCategory != Done ORDER BY updated DESC' },
  { label: 'In Progress',        jql: 'labels = "oqs-requests" AND status = "In Progress" ORDER BY updated DESC' },
  { label: 'Done',               jql: 'labels = "oqs-requests" AND statusCategory = Done ORDER BY updated DESC' },
  { label: 'High priority',      jql: 'labels = "oqs-requests" AND priority in (Highest, High) AND statusCategory != Done ORDER BY priority ASC' },
]

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...s.card, borderTop: `3px solid ${accent}` }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: accent }}>{value}</span>
      <span style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</span>
    </div>
  )
}

// ── Status bar chart ─────────────────────────────────────────────────────────

function StatusChart({ issues }) {
  const data = useMemo(() => {
    const counts = {}
    issues.forEach(({ fields }) => {
      const name = fields.status?.name ?? 'Unknown'
      counts[name] = (counts[name] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [issues])

  if (!data.length) return null

  return (
    <div style={s.chartBox}>
      <p style={s.chartLabel}>Issues by status</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLOR[entry.name] ?? '#8b5cf6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Priority chart ───────────────────────────────────────────────────────────

function PriorityChart({ issues }) {
  const data = useMemo(() => {
    const counts = {}
    issues.forEach(({ fields }) => {
      const name = fields.priority?.name ?? 'Unknown'
      counts[name] = (counts[name] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, fill: PRIORITY_DOT[name]?.color ?? '#94a3b8' }))
  }, [issues])

  if (!data.length) return null

  return (
    <div style={s.chartBox}>
      <p style={s.chartLabel}>Issues by priority</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={55}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ issues }) {
  const total = issues.length
  const done = issues.filter(({ fields }) => fields.status?.statusCategory?.key === 'done').length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        <span>{done} of {total} completed</span>
        <span style={{ fontWeight: 600, color: '#22c55e' }}>{pct}%</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
          height: '100%',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({ issue }) {
  const { key, fields } = issue
  const statusName = fields.status?.name ?? '—'
  const priority   = fields.priority?.name ?? '—'
  const assignee   = fields.assignee?.displayName ?? 'Unassigned'
  const updated    = new Date(fields.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const labels     = (fields.labels ?? []).filter(l => l !== 'oqs-requests')
  const dot        = PRIORITY_DOT[priority]

  const statusBg = STATUS_COLOR[statusName] ?? '#e2e8f0'
  const statusFg = statusName === 'To Do' ? '#475569' : '#fff'

  return (
    <tr style={s.row}>
      <td style={s.td}>
        <a
          href={`https://unherd.atlassian.net/browse/${key}`}
          target="_blank"
          rel="noreferrer"
          style={s.keyLink}
        >
          {key}
        </a>
      </td>
      <td style={{ ...s.td, maxWidth: 380 }}>
        <span style={s.summary}>{fields.summary}</span>
        {labels.length > 0 && (
          <div style={s.labelRow}>
            {labels.map((l) => (
              <span key={l} style={s.labelChip}>{l}</span>
            ))}
          </div>
        )}
      </td>
      <td style={s.td}>
        <span style={{ ...s.statusBadge, background: statusBg, color: statusFg }}>
          {statusName}
        </span>
      </td>
      <td style={s.td}>
        {dot ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot.color, flexShrink: 0 }} />
            {priority}
          </span>
        ) : priority}
      </td>
      <td style={{ ...s.td, color: '#475569', fontSize: 13 }}>{assignee}</td>
      <td style={{ ...s.td, color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{updated}</td>
    </tr>
  )
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function IssueDashboard() {
  const [activePreset, setActivePreset] = useState(0)
  const [customJql, setCustomJql]       = useState('')
  const [jql, setJql]                   = useState(PRESETS[0].jql)

  const { issues, total, loading, error, refetch } = useJiraIssues(jql, 100)

  const stats = useMemo(() => {
    const done       = issues.filter(({ fields }) => fields.status?.statusCategory?.key === 'done').length
    const inProgress = issues.filter(({ fields }) => fields.status?.name === 'In Progress').length
    const open       = issues.length - done
    return { total: issues.length, done, inProgress, open }
  }, [issues])

  const handlePreset = (i) => {
    setActivePreset(i)
    setCustomJql('')
    setJql(PRESETS[i].jql)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (customJql.trim()) {
      setActivePreset(-1)
      setJql(customJql.trim())
    }
  }

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>OQS Requests</h1>
          <p style={s.subtitle}>Tickets tagged <code style={s.tag}>oqs-requests</code></p>
        </div>
        <button onClick={refetch} style={s.refreshBtn} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div style={s.statsRow}>
          <StatCard label="Total"       value={stats.total}      accent="#6366f1" />
          <StatCard label="Open"        value={stats.open}       accent="#f59e0b" />
          <StatCard label="In Progress" value={stats.inProgress} accent="#3b82f6" />
          <StatCard label="Done"        value={stats.done}       accent="#22c55e" />
        </div>
      )}

      {/* Progress */}
      {!loading && !error && issues.length > 0 && <ProgressBar issues={issues} />}

      {/* Charts */}
      {!loading && !error && issues.length > 0 && (
        <div style={s.chartsRow}>
          <StatusChart issues={issues} />
          <PriorityChart issues={issues} />
        </div>
      )}

      {/* Filters */}
      <div style={s.filterSection}>
        <div style={s.presets}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handlePreset(i)}
              style={{
                ...s.presetBtn,
                ...(activePreset === i && !customJql ? s.presetBtnActive : {}),
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} style={s.jqlForm}>
          <input
            style={s.jqlInput}
            type="text"
            placeholder="Custom JQL…"
            value={customJql}
            onChange={(e) => setCustomJql(e.target.value)}
          />
          <button type="submit" style={s.searchBtn}>Search</button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div style={s.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table */}
      {!error && (
        <>
          <p style={s.countLine}>
            {loading ? 'Fetching…' : `Showing ${issues.length} of ${total} issues`}
          </p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Key', 'Summary', 'Status', 'Priority', 'Assignee', 'Updated'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)}
              </tbody>
            </table>
            {!loading && issues.length === 0 && (
              <div style={s.empty}>No issues found.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page:            { fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 1200, margin: '0 auto', padding: '32px 24px', background: '#f8fafc', minHeight: '100vh' },
  header:          { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  title:           { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 },
  subtitle:        { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 0 },
  tag:             { background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: 4, fontSize: 12 },
  refreshBtn:      { padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 },

  statsRow:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 },
  card:            { background: '#fff', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },

  chartsRow:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 },
  chartBox:        { background: '#fff', borderRadius: 10, padding: '16px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  chartLabel:      { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 4px' },

  filterSection:   { marginBottom: 12 },
  presets:         { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  presetBtn:       { padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 },
  presetBtnActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  jqlForm:         { display: 'flex', gap: 8 },
  jqlInput:        { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', outline: 'none' },
  searchBtn:       { padding: '8px 16px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 },

  error:           { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 13 },
  countLine:       { fontSize: 12, color: '#94a3b8', marginBottom: 8 },

  tableWrap:       { background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflowX: 'auto' },
  table:           { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:              { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' },
  row:             { borderBottom: '1px solid #f8fafc' },
  td:              { padding: '12px 16px', verticalAlign: 'middle' },
  keyLink:         { fontFamily: 'monospace', color: '#6366f1', fontWeight: 600, textDecoration: 'none', fontSize: 13 },
  summary:         { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' },
  labelRow:        { display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  labelChip:       { fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontWeight: 500 },
  statusBadge:     { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  empty:           { textAlign: 'center', color: '#94a3b8', padding: '48px 0', fontSize: 14 },
}
