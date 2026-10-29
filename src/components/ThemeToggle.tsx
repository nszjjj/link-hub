import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from '../lib/theme'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(getStoredTheme())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)

    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, mounted])

  const cycle = () => {
    const order: Theme[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
    setStoredTheme(next)
  }

  const current = options.find((o) => o.value === theme) ?? options[2]
  const Icon = current.icon

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-12 rounded-lg text-muted-foreground', className)}
        aria-hidden
        tabIndex={-1}
      >
        <Sun className="size-4 opacity-0" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`当前主题：${current.label}，点击切换`}
      title={current.label}
      className={cn(
        'size-12 rounded-lg text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  )
}
