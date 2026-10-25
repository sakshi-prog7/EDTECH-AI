/* Starts the working FastAPI backend and Vite frontend together on Windows/macOS/Linux. */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const python = process.platform === 'win32' ? 'python' : 'python3'

const backend = spawn(python, ['-m', 'uvicorn', 'backend.app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
})
const frontend = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], { cwd: root, stdio: 'inherit', shell: true })

const shutdown = () => {
  backend.kill('SIGTERM')
  frontend.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
backend.on('exit', (code) => {
  if (code !== 0) frontend.kill('SIGTERM')
})
