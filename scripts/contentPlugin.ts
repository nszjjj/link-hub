import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'
import { generateData } from './generate-data.ts'
import { formatValidationIssue } from './validate.ts'

function isWithin(directory: string, file: string): boolean {
  const path = relative(directory, file)
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
}

export function contentPlugin(): Plugin {
  let cleanup: (() => void) | undefined
  return {
    name: 'link-hub-content',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const contentDir = resolve(root, 'content')
      const publicDir = resolve(root, 'public')
      const outputDir = resolve(publicDir, 'data')
      const dataPath = `${server.config.base}data/links.json`
      let lastError: string | undefined
      let payload: string | undefined
      let timer: ReturnType<typeof setTimeout> | undefined

      function regenerate(initial = false): void {
        const previousError = lastError
        try {
          const { report, changed } = generateData(root)
          lastError = report.errors.length
            ? report.errors.map(formatValidationIssue).join('\n')
            : undefined
          if (!lastError) {
            payload = `${JSON.stringify(report.data, null, 2)}\n`
            for (const warning of report.warnings)
              server.config.logger.warn(`[内容警告] ${formatValidationIssue(warning)}`)
            if (!initial && (changed || previousError))
              server.ws.send({ type: 'full-reload', path: '*' })
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error)
        }
        if (lastError) {
          server.config.logger.error(`[内容校验失败]\n${lastError}`)
          server.ws.send({ type: 'error', err: { message: lastError, stack: '' } })
        }
      }

      regenerate(true)
      // 显式服务校验后的数据，避免首次生成晚于 Vite 的 public 扫描而出现 404。
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        if (pathname !== dataPath) return next()
        response.statusCode = lastError ? 503 : 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(
          lastError ? JSON.stringify({ error: '内容校验失败', details: lastError }) : payload,
        )
      })

      function onChange(_event: string, file: string): void {
        const path = resolve(file)
        if (
          !isWithin(contentDir, path) &&
          !(isWithin(publicDir, path) && !isWithin(outputDir, path))
        )
          return
        clearTimeout(timer)
        timer = setTimeout(() => regenerate(), 75)
      }
      server.watcher.add([contentDir, publicDir])
      server.watcher.on('all', onChange)
      cleanup = () => {
        clearTimeout(timer)
        server.watcher.off('all', onChange)
      }
    },
    closeBundle() {
      cleanup?.()
    },
  }
}
