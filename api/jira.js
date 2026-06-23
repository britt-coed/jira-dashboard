export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'function is running' })
  }

  try {
    const credentials = Buffer.from(
      `${process.env.VITE_JIRA_EMAIL}:${process.env.VITE_JIRA_API_TOKEN}`
    ).toString('base64')

    const body = req.body ?? {}
    const { jql = 'ORDER BY updated DESC', maxResults = 20, fields = ['summary','status','priority','assignee','issuetype','updated','project','labels'] } = body

    const params = new URLSearchParams({
      jql,
      maxResults,
      fields: Array.isArray(fields) ? fields.join(',') : fields,
    })

    const jiraUrl = `https://${process.env.VITE_JIRA_DOMAIN}.atlassian.net/rest/api/3/issue/search?${params}`

    const jiraRes = await fetch(jiraUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    })

    const data = await jiraRes.json()

    // Return debug info alongside result so we can diagnose issues
    if (!jiraRes.ok) {
      return res.status(jiraRes.status).json({
        jiraStatus: jiraRes.status,
        jiraUrl,
        domain: process.env.VITE_JIRA_DOMAIN,
        error: data
      })
    }

    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack })
  }
}