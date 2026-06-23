
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
 
    const url = `https://${process.env.VITE_JIRA_DOMAIN}.atlassian.net/rest/api/3/issue/search`
 
    const jiraRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(req.body),
    })
 
    const data = await jiraRes.json()
    res.status(jiraRes.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}