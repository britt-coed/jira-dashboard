import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend,
} from 'recharts'
import { useJiraIssues } from '../hooks/useJiraIssues'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  'To Do':       '#e2e8f0',
  'In Progress': '#3b82f6',
  'In Review':   '#f59e0b',
  'Done':        '#22c55e',
  'Blocked':     '#ef4444',
}
const STATUS_FG = { 'To Do': '#475569' }

const PRIORITY_DOT = {
  Highest: '#ef4444',
  High:    '#f97316',
  Medium:  '#eab308',
  Low:     '#3b82f6',
  Lowest:  '#94a3b8',
}

const TYPE_FILTERS = [
  { label: 'All types',        value: '' },
  { label: 'Support Request',  value: 'Support Request' },
  { label: 'Bug',              value: 'Bug' },
]

const SORT_OPTIONS = [
  { label: 'Updated (newest)', field: 'updated',  dir: 'desc' },
  { label: 'Updated (oldest)', field: 'updated',  dir: 'asc' },
  { label: 'Priority',         field: 'priority', dir: 'asc' },
  { label: 'Status',           field: 'status',   dir: 'asc' },
  { label: 'Key',              field: 'key',      dir: 'asc' },
]

const PRIORITY_ORDER = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 }
const STATUS_ORDER   = { 'Blocked': 0, 'In Progress': 1, 'In Review': 2, 'To Do': 3, 'Done': 4 }

const PRESETS = [
  { label: 'All OQS requests', jql: 'labels = "OQS-Request" ORDER BY updated DESC' },
  { label: 'Open',             jql: 'labels = "OQS-Request" AND statusCategory != Done ORDER BY updated DESC' },
  { label: 'In Progress',      jql: 'labels = "OQS-Request" AND status = "In Progress" ORDER BY updated DESC' },
  { label: 'Done',             jql: 'labels = "OQS-Request" AND statusCategory = Done ORDER BY updated DESC' },
  { label: 'High priority',    jql: 'labels = "OQS-Request" AND priority in (Highest, High) AND statusCategory != Done ORDER BY priority ASC' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function adfToText(node) {
  if (!node) return ''
  if (node.type === 'text') return node.text ?? ''
  if (node.content) return node.content.map(adfToText).join(' ')
  return ''
}

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function sortIssues(issues, { field, dir }) {
  const mult = dir === 'asc' ? 1 : -1
  return [...issues].sort((a, b) => {
    let av, bv
    if (field === 'updated')  { av = a.fields.updated; bv = b.fields.updated; return mult * av.localeCompare(bv) }
    if (field === 'priority') { av = PRIORITY_ORDER[a.fields.priority?.name] ?? 99; bv = PRIORITY_ORDER[b.fields.priority?.name] ?? 99; return mult * (av - bv) }
    if (field === 'status')   { av = STATUS_ORDER[a.fields.status?.name] ?? 99; bv = STATUS_ORDER[b.fields.status?.name] ?? 99; return mult * (av - bv) }
    if (field === 'key')      { return mult * a.key.localeCompare(b.key) }
    return 0
  })
}

// ── Tiny components ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...s.card, borderTop: `3px solid ${accent}` }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: accent }}>{value}</span>
      <span style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</span>
    </div>
  )
}

function StatusBadge({ name }) {
  const bg = STATUS_COLOR[name] ?? '#e2e8f0'
  const fg = STATUS_FG[name] ?? '#fff'
  return <span style={{ ...s.statusBadge, background: bg, color: fg }}>{name}</span>
}

// ── Charts ────────────────────────────────────────────────────────────────────

function StatusChart({ issues }) {
  const data = useMemo(() => {
    const c = {}
    issues.forEach(({ fields }) => { const n = fields.status?.name ?? 'Unknown'; c[n] = (c[n] ?? 0) + 1 })
    return Object.entries(c).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [issues])
  if (!data.length) return null
  return (
    <div style={s.chartBox}>
      <p style={s.chartLabel}>By status</p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={36}>
            {data.map(e => <Cell key={e.name} fill={STATUS_COLOR[e.name] ?? '#8b5cf6'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PriorityChart({ issues }) {
  const data = useMemo(() => {
    const c = {}
    issues.forEach(({ fields }) => { const n = fields.priority?.name ?? 'Unknown'; c[n] = (c[n] ?? 0) + 1 })
    return Object.entries(c).map(([name, count]) => ({ name, count, fill: PRIORITY_DOT[name] ?? '#94a3b8' }))
  }, [issues])
  if (!data.length) return null
  return (
    <div style={s.chartBox}>
      <p style={s.chartLabel}>By priority</p>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={50} paddingAngle={2}>
            {data.map(e => <Cell key={e.name} fill={e.fill} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function TypeChart({ issues }) {
  const data = useMemo(() => {
    const c = {}
    issues.forEach(({ fields }) => { const n = fields.issuetype?.name ?? 'Other'; c[n] = (c[n] ?? 0) + 1 })
    return Object.entries(c).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [issues])
  if (!data.length) return null
  const COLORS = ['#6366f1','#f59e0b','#22c55e','#ef4444','#8b5cf6']
  return (
    <div style={s.chartBox}>
      <p style={s.chartLabel}>By type</p>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={50} paddingAngle={2}>
            {data.map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

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
        <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)', height: '100%', borderRadius: 99, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

// ── Client table ──────────────────────────────────────────────────────────────

function ClientTable({ issues }) {
  const rows = useMemo(() => {
    const map = {}
    issues.forEach(({ fields }) => {
      const name = fields.reporter?.displayName ?? 'Unknown'
      if (!map[name]) map[name] = { name, total: 0, open: 0, inProgress: 0, done: 0, types: {} }
      const r = map[name]
      r.total++
      const cat = fields.status?.statusCategory?.key
      if (cat === 'done') r.done++
      else if (fields.status?.name === 'In Progress') r.inProgress++
      else r.open++
      const type = fields.issuetype?.name ?? 'Other'
      r.types[type] = (r.types[type] ?? 0) + 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [issues])

  if (!rows.length) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={s.sectionTitle}>Requests by client</h2>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Client / Reporter', 'Total', 'Open', 'In Progress', 'Done', 'Types'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} style={s.row}>
                <td style={{ ...s.td, fontWeight: 600, color: '#1e293b' }}>{row.name}</td>
                <td style={{ ...s.td, color: '#6366f1', fontWeight: 600 }}>{row.total}</td>
                <td style={{ ...s.td, color: '#f59e0b' }}>{row.open}</td>
                <td style={{ ...s.td, color: '#3b82f6' }}>{row.inProgress}</td>
                <td style={{ ...s.td, color: '#22c55e' }}>{row.done}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {Object.entries(row.types).map(([type, count]) => (
                      <span key={type} style={s.labelChip}>{type} ({count})</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Accordion issue row ───────────────────────────────────────────────────────

function IssueRow({ issue, expanded, onToggle }) {
  const { key, fields } = issue
  const statusName  = fields.status?.name ?? '—'
  const priority    = fields.priority?.name ?? '—'
  const assignee    = fields.assignee?.displayName ?? 'Unassigned'
  const reporter    = fields.reporter?.displayName ?? '—'
  const updated     = fmtDate(fields.updated)
  const created     = fmtDate(fields.created)
  const labels      = (fields.labels ?? []).filter(l => l !== 'OQS-Request')
  const description = fields.description ? adfToText(fields.description).trim() : null
  const dotColor    = PRIORITY_DOT[priority]

  return (
    <>
      <tr
        style={{ ...s.row, cursor: 'pointer', background: expanded ? '#f8fafc' : 'transparent' }}
        onClick={onToggle}
      >
        <td style={s.td}><span style={s.keyLink}>{key}</span></td>
        <td style={{ ...s.td, maxWidth: 360 }}>
          <span style={s.summary}>{fields.summary}</span>
          {labels.length > 0 && (
            <div style={s.labelRow}>
              {labels.map(l => <span key={l} style={s.labelChip}>{l}</span>)}
            </div>
          )}
        </td>
        <td style={s.td}><StatusBadge name={statusName} /></td>
        <td style={s.td}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
            {dotColor && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
            {priority}
          </span>
        </td>
        <td style={{ ...s.td, fontSize: 13, color: '#475569' }}>{assignee}</td>
        <td style={{ ...s.td, fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{updated}</td>
        <td style={{ ...s.td, color: '#94a3b8', textAlign: 'center', fontSize: 10 }}>{expanded ? '▲' : '▼'}</td>
      </tr>

      {expanded && (
        <tr style={{ background: '#f8fafc' }}>
          <td colSpan={7} style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ paddingTop: 16 }}>
              <p style={s.accordionHeading}>Description</p>
              <p style={{ ...s.accordionBody, marginBottom: 16 }}>
                {description || <em style={{ color: '#94a3b8' }}>No description provided.</em>}
              </p>
              <div style={s.metaGrid}>
                {[
                  ['Reporter',  reporter],
                  ['Assignee',  assignee],
                  ['Type',      fields.issuetype?.name ?? '—'],
                  ['Project',   fields.project?.name ?? '—'],
                  ['Created',   created],
                  ['Updated',   updated],
                ].map(([label, val]) => (
                  <div key={label} style={s.metaItem}>
                    <span style={s.metaLabel}>{label}</span>
                    <span style={s.metaValue}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function IssueDashboard() {
  const [activePreset, setActivePreset] = useState(0)
  const [customJql, setCustomJql]       = useState('')
  const [jql, setJql]                   = useState(PRESETS[0].jql)
  const [typeFilter, setTypeFilter]     = useState('')
  const [sortIdx, setSortIdx]           = useState(0)
  const [expanded, setExpanded]         = useState({})

  const { issues, total, loading, error, refetch } = useJiraIssues(jql, 100)

  // Apply type filter + sort client-side
  const displayIssues = useMemo(() => {
    let list = typeFilter
      ? issues.filter(({ fields }) => fields.issuetype?.name === typeFilter)
      : issues
    return sortIssues(list, SORT_OPTIONS[sortIdx])
  }, [issues, typeFilter, sortIdx])

  const stats = useMemo(() => {
    const done       = issues.filter(({ fields }) => fields.status?.statusCategory?.key === 'done').length
    const inProgress = issues.filter(({ fields }) => fields.status?.name === 'In Progress').length
    const open       = issues.length - done
    return { total: issues.length, done, inProgress, open }
  }, [issues])

  const handlePreset = (i) => {
    setActivePreset(i); setCustomJql(''); setJql(PRESETS[i].jql); setExpanded({})
  }
  const handleSearch = (e) => {
    e.preventDefault()
    if (customJql.trim()) { setActivePreset(-1); setJql(customJql.trim()); setExpanded({}) }
  }
  const toggleRow = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>OQS Requests</h1>
          <p style={s.subtitle}>Tickets tagged <code style={s.tag}>OQS-Request</code></p>
        </div>
        <button onClick={refetch} style={s.refreshBtn} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Stat cards */}
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
        <div style={{ ...s.chartsRow, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <StatusChart issues={issues} />
          <PriorityChart issues={issues} />
          <TypeChart issues={issues} />
        </div>
      )}

      {/* Client table */}
      {!loading && !error && issues.length > 0 && <ClientTable issues={issues} />}

      {/* Preset filters */}
      <div style={s.filterSection}>
        <div style={s.presets}>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => handlePreset(i)}
              style={{ ...s.presetBtn, ...(activePreset === i && !customJql ? s.presetBtnActive : {}) }}>
              {p.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} style={s.jqlForm}>
          <input style={s.jqlInput} type="text" placeholder="Custom JQL…"
            value={customJql} onChange={e => setCustomJql(e.target.value)} />
          <button type="submit" style={s.searchBtn}>Search</button>
        </form>
      </div>

      {/* Type + sort row */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>Filter by type:</span>
          {TYPE_FILTERS.map(tf => (
            <button key={tf.value} onClick={() => setTypeFilter(tf.value)}
              style={{ ...s.presetBtn, ...(typeFilter === tf.value ? s.presetBtnActive : {}), padding: '4px 12px', fontSize: 12 }}>
              {tf.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Sort:</span>
            <select
              value={sortIdx}
              onChange={e => setSortIdx(Number(e.target.value))}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', color: '#374151', cursor: 'pointer' }}
            >
              {SORT_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div style={s.error}><strong>Error:</strong> {error}</div>}

      {/* Issues table */}
      {!error && (
        <>
          <p style={s.countLine}>
            {loading ? 'Fetching…' : `Showing ${displayIssues.length}${typeFilter ? ` ${typeFilter}` : ''} issues`}
          </p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Key', 'Summary', 'Status', 'Priority', 'Assignee', 'Updated', ''].map((h, i) => (
                    <th key={i} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayIssues.map(issue => (
                  <IssueRow key={issue.id} issue={issue}
                    expanded={!!expanded[issue.id]} onToggle={() => toggleRow(issue.id)} />
                ))}
              </tbody>
            </table>
            {!loading && displayIssues.length === 0 && <div style={s.empty}>No issues found.</div>}
          </div>
        </>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page:            { fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 1200, margin: '0 auto', padding: '32px 24px', background: '#f8fafc', minHeight: '100vh' },
  header:          { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  title:           { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 },
  subtitle:        { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 0 },
  tag:             { background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: 4, fontSize: 12 },
  refreshBtn:      { padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 },

  statsRow:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 },
  card:            { background: '#fff', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },

  chartsRow:       { display: 'grid', gap: 12, marginBottom: 28 },
  chartBox:        { background: '#fff', borderRadius: 10, padding: '16px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  chartLabel:      { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px 4px' },

  sectionTitle:    { fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 10 },

  filterSection:   { marginBottom: 10 },
  presets:         { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  presetBtn:       { padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 },
  presetBtnActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  jqlForm:         { display: 'flex', gap: 8 },
  jqlInput:        { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', outline: 'none' },
  searchBtn:       { padding: '8px 16px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 },

  error:           { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 13 },
  countLine:       { fontSize: 12, color: '#94a3b8', marginBottom: 8 },

  tableWrap:       { background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflowX: 'auto', marginBottom: 8 },
  table:           { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:              { textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' },
  row:             { borderBottom: '1px solid #f8fafc' },
  td:              { padding: '11px 16px', verticalAlign: 'middle' },
  keyLink:         { fontFamily: 'monospace', color: '#6366f1', fontWeight: 600, fontSize: 13 },
  summary:         { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' },
  labelRow:        { display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  labelChip:       { fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontWeight: 500 },
  statusBadge:     { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  empty:           { textAlign: 'center', color: '#94a3b8', padding: '48px 0', fontSize: 14 },

  accordionHeading:{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' },
  accordionBody:   { fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' },
  metaGrid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px 24px' },
  metaItem:        { display: 'flex', flexDirection: 'column', gap: 2 },
  metaLabel:       { fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  metaValue:       { fontSize: 13, color: '#374151' },
}
