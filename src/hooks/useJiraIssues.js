import { useState, useEffect, useCallback } from 'react'

const DEFAULT_JQL = 'assignee = currentUser() ORDER BY updated DESC'

/**
 * Fetches Jira issues via the Vite dev proxy (/jira-api → /rest/api/3).
 * In production you'd swap /jira-api for a backend route.
 */
export function useJiraIssues(jql = DEFAULT_JQL, maxResults = 50) {
  const [issues, setIssues] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const credentials = btoa(
        `${import.meta.env.VITE_JIRA_EMAIL}:${import.meta.env.VITE_JIRA_API_TOKEN}`
      )
      const res = await fetch(`/jira-api/search/jql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          jql,
          maxResults,
          fields: ['summary', 'status', 'priority', 'assignee', 'issuetype', 'updated', 'project'],
        }),
      })
      if (!res.ok) throw new Error(`Jira API error: ${res.status} ${res.statusText}`)
      const data = await res.json()
      setIssues(data.issues ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [jql, maxResults])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  return { issues, total, loading, error, refetch: fetchIssues }
}
