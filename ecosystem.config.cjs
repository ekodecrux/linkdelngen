// LinkedBoost AI - PM2 Ecosystem Config
// ⚠️  Secrets are loaded from .dev.vars file (not committed to git)
// Copy .dev.vars.example to .dev.vars and fill in your credentials

const fs = require('fs')
const path = require('path')

// Load .dev.vars file into environment variables
function loadDevVars() {
  const devVarsPath = path.join(__dirname, '.dev.vars')
  if (!fs.existsSync(devVarsPath)) return {}
  const content = fs.readFileSync(devVarsPath, 'utf8')
  const vars = {}
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key) vars[key] = val
  })
  return vars
}

const secrets = loadDevVars()

module.exports = {
  apps: [
    {
      name: 'linkedboost-ai',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        ...secrets
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
