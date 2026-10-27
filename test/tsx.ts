import { createRequire } from 'node:module'

/**
 * Windows 无法直接 spawn node_modules/.bin 下无扩展名的 shim，
 * 统一通过当前 Node 执行 tsx 的 CLI 入口。
 */
export const tsxCli = createRequire(import.meta.url).resolve('tsx/cli')
