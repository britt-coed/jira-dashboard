// Vercel serverless function — handles Jira API calls in production.
// Vercel auto-parses JSON request bodies, so we use req.body directly.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'function is running' })
  }
  try {
    const credentials = Buffer.from(
      `${process.env.VITE_JIRA_EMAIL}:${process.env.VITE_JIRA_API_TOKEN}`
    ).toString('base64')
 
    const { jql, maxResults, fields } = req.body
    const params = new URLSearchParams({
      jql,
      maxResults,
      fields: Array.isArray(fields) ? fields.join(',') : fields,
    })
 
    const url = `https://${process.env.VITE_JIRA_DOMAIN}.atlassian.net/rest/api/3/issue/search?${params}`
 
    const jiraRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    })
 
    const data = await jiraRes.json()
    res.status(jiraRes.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
 
