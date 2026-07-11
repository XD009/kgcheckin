import { spawn } from 'child_process'

/** 延时 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 启动 api 服务（detached 使其成为独立进程组，便于整组强杀） */
function startService() {
  const api = spawn('npm', ['run', 'apiService'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  api.stdout.on('data', () => {})
  api.stderr.on('data', data => {
    const msg = String(data).trim()
    if (msg) console.log('[api stderr]', msg)
  })
  api.on('close', code => console.log(`[api] 子进程退出，code=${code}`))

  return api
}

/**
 * 关闭 api 服务。
 * 关键修复：npm 不会把 SIGTERM 转发给它的子进程（真正的 Express 服务），
 * 仅 api.kill() 会导致 3000 端口一直被占 → 下一阶段 startService 报 EADDRINUSE。
 * 因此用 detached 进程组 + process.kill(-pid) 强杀整组。
 */
function close_api(api) {
  try {
    process.kill(-api.pid, 'SIGKILL') // 杀掉整个进程组（npm + Express）
  } catch (e) {
    try { api.kill('SIGKILL') } catch (_) { /* 已退出 */ }
  }
}

/** 发送请求到本地 api 服务 */
async function send(path, method, headers) {
  const result = await fetch('http://127.0.0.1:3000' + path, {
    method,
    headers,
  }).then(r => r.json())
  return result
}

export { delay, startService, close_api, send }
