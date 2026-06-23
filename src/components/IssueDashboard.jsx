import { useState } from 'react'
import { useJiraIssues } from '../hooks/useJiraIssues'

const STATUS_COLORS = {
  'To Do': '#6b7280',
  'In Progress': '#3b82f6',
  'Done': '#22c55e',
  'In Review': '#f59e0b',
}

const PRIORITY_ICONS = {
  Highest: '🔴',
  High: '🟠',
  Medium: '🟡',
  Low: '🔵',
  Lowest: '⚪',
}

const JQL_PRESETS = [
  { label: 'My open issues', jql: 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC' },
  { label: 'All open issues', jql: 'statusCategory != Done ORDER BY updated DESC' },
  { label: 'Recently updated', jql: 'updated >= -7d ORDER BY updated DESC' },
  { label: 'High priority', jql: 'priority in (Highest, High) AND statusCategory != Done ORDER BY priority ASC' },
]

function IssueRow({ issue }) {
  const { key, fields } = issue
  const status = fields.status?.name ?? '—'
  const priority = fields.priority?.name ?? '—'
  const assignee = fields.assignee?.displayName ?? 'Unassigned'
  const updated = new Date(fields.updated).toLocaleDateString()
  const color = STATUS_COLORS[status] ?? '#9ca3af'

  return (
    <tr style={styles.row}>
      <td style={styles.td}>
        <span style={styles.issueKey}>{key}</span>
      </td>
      <td style={{ ...styles.td, maxWidth: 400 }}>
        <span style={styles.summary}>{fields.summary}</span>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.badge, background: color }}>
          {status}
        </span>
      </td>
      <td style={styles.td}>
        {PRIORITY_ICONS[priority] ?? '—'} {priority}
      </td>
      <td style={styles.td}>{assignee}</td>
      <td style={styles.td}>{updated}</td>
    </tr>
  )
}

export default function IssueDashboard() {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customJql, setCustomJql] = useState('')
  const [activeJql, setActiveJql] = useState(JQL_PRESETS[0].jql)

  const { issues, total, loading, error, refetch } = useJiraIssues(activeJql)

  const handlePreset = (i) => {
    setSelectedPreset(i)
    setCustomJql('')
    setActiveJql(JQL_PRESETS[i].jql)
  }

  const handleCustomSearch = (e) => {
    e.preventDefault()
    if (customJql.trim()) setActiveJql(customJql.trim())
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Jira Dashboard</h1>
        <button onClick={refetch} style={styles.refreshBtn} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Preset filters */}
      <div style={styles.presets}>
        {JQL_PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => handlePreset(i)}
            style={{
              ...styles.presetBtn,
              ...(selectedPreset === i && !customJql ? styles.presetBtnActive : {}),
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom JQL search */}
      <form onSubmit={handleCustomSearch} style={styles.jqlForm}>
        <input
          style={styles.jqlInput}
          type="text"
          placeholder="Custom JQL query…"
          value={customJql}
          onChange={(e) => setCustomJql(e.target.value)}
        />
        <button type="submit" style={styles.searchBtn}>Search</button>
      </form>

      {/* Error state */}
      {error && (
        <div style={styles.error}>
          Error: {error}. Check your <code>.env</code> values and that your API token is valid.
        </div>
      )}

      {/* Results */}
      {!error && (
        <>
          <p style={styles.count}>
            {loading ? 'Fetching issues…' : `Showing ${issues.length} of ${total} issues`}
          </p>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Key', 'Summary', 'Status', 'Priority', 'Assignee', 'Updated'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </tbody>
            </table>
            {!loading && issues.length === 0 && (
              <p style={styles.empty}>No issues found.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '24px 16px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  refreshBtn: { padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: 14 },
  presets: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  presetBtn: { padding: '6px 14px', borderRadius: 20, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 },
  presetBtnActive: { background: '#2563eb', color: '#fff', borderColor: '#2563eb' },
  jqlForm: { display: 'flex', gap: 8, marginBottom: 20 },
  jqlInput: { flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 },
  searchBtn: { padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '12px 16px', color: '#dc2626', marginBottom: 16 },
  count: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontWeight: 600, whiteSpace: 'nowrap' },
  row: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
  issueKey: { fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 },
  summary: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, color: '#fff', fontSize: 12, fontWeight: 500 },
  empty: { textAlign: 'center', color: '#6b7280', padding: 40 },
}
