export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'function is running' })
  }

  try {
    const credentials = Buffer.from(
      `${process.env.VITE_JIRA_EMAIL}:${process.env.VITE_JIRA_API_TOKEN}`
    ).toString('base64')

    const body = req.body ?? {}
    const {
      jql = 'ORDER BY updated DESC',
      maxResults = 50,
      fields = ['summary', 'status', 'priority', 'assignee', 'issuetype', 'updated', 'project', 'labels'],
    } = body

    const jiraUrl = `https://${process.env.VITE_JIRA_DOMAIN}.atlassian.net/rest/api/3/search/jql`

    const jiraRes = await fetch(jiraUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ jql, maxResults, fields }),
    })

    const data = await jiraRes.json()

    if (!jiraRes.ok) {
      return res.status(jiraRes.status).json({ error: data, jiraUrl })
    }

    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}