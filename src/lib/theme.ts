export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'link-hub-theme'
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

/** matchMedia 在 jsdom 和部分内嵌 WebView 中不存在 */
function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

export function getStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // ignore
  }
  return 'system'
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return systemPrefersDark() ? 'dark' : 'light'
  }
  return theme
}

/** 监听系统配色变化，环境不支持时返回空清理函数 */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(SYSTEM_DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore
  }
  applyTheme(theme)
}

/** Call as early as possible to avoid FOUC */
export function initTheme() {
  applyTheme(getStoredTheme())
}
