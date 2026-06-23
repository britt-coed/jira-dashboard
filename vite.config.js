import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const credentials = Buffer.from(
    `${env.VITE_JIRA_EMAIL}:${env.VITE_JIRA_API_TOKEN}`
  ).toString('base64')

  return {
    plugins: [
      react(),
      {
        name: 'jira-middleware',
        configureServer(server) {
          server.middlewares.use('/jira-api', async (req, res) => {
            try {
              // Read request body
              const body = await new Promise((resolve) => {
                let data = ''
                req.on('data', (chunk) => (data += chunk))
                req.on('end', () => resolve(data))
              })

              const url = `https://${env.VITE_JIRA_DOMAIN}.atlassian.net/rest/api/3${req.url}`

              const jiraRes = await fetch(url, {
                method: req.method,
                headers: {
                  Authorization: `Basic ${credentials}`,
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: req.method !== 'GET' && body ? body : undefined,
              })

              const data = await jiraRes.json()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = jiraRes.status
              res.end(JSON.stringify(data))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        },
      },
    ],
  }
})
