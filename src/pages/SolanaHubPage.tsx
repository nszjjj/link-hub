import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle, Map as MapIcon } from 'lucide-react'
import { solanaHub } from '../content/hubs/solana'
import { useLinks } from '../hooks/useLinks'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { roadmapPagePath } from '../lib/routes'
import type { Item, RoadmapItem } from '../lib/schema'
import { ItemCard } from '../components/ItemCard'
import { ThemeToggle } from '../components/ThemeToggle'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardHeader } from '../components/ui/card'

export function SolanaHubPage() {
  useDocumentMeta(solanaHub.title, solanaHub.seoDescription)
  const links = useLinks()
  const data = links.status === 'ready' ? links.data : undefined
  const byId = useMemo(() => {
    const map = new Map<string, Item>()
    data?.items.forEach((item) => map.set(item.id, item))
    return map
  }, [data])
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set())
  const featured = solanaHub.featuredRoadmapId
    ? (byId.get(solanaHub.featuredRoadmapId) as RoadmapItem | undefined)
    : undefined

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="min-w-0">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              返回 Link Hub 首页
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">本站专题 · Web3 / Solana</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 py-8 sm:px-8 md:py-10">
        {links.status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            正在加载
          </p>
        )}
        {links.status === 'error' && (
          <div role="alert" className="py-16 text-center">
            <BookOpen className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold">资源暂时无法加载</h1>
            <Button onClick={links.retry} className="mt-6 h-12 rounded-md px-5">
              重新加载
            </Button>
          </div>
        )}
        {data && (
          <>
            <header className="mb-10 max-w-3xl">
              <p className="text-sm font-medium text-primary">Link Hub 站内专题</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{solanaHub.title}</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{solanaHub.intro}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                本页是导航站内部的 Solana 专题子页面，不是外部网站；资源与路线由本站整理与维护。
              </p>
              <p className="mt-2 text-sm text-muted-foreground">适合：{solanaHub.audience}</p>
              {featured?.dedicatedPage && (
                <Button asChild className="mt-6 h-12 rounded-xl px-5">
                  <Link to={roadmapPagePath('solana', featured.id)}>
                    打开完整开发路径
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </header>

            <div className="space-y-12">
              {solanaHub.sections.map((section) => {
                const items = (section.itemIds ?? [])
                  .map((id) => byId.get(id))
                  .filter((item): item is Item => Boolean(item))
                return (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                    {section.body && (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {section.body}
                      </p>
                    )}
                    {items.length > 0 && (
                      <div className="mt-5 grid gap-4 md:grid-cols-2 min-[75rem]:grid-cols-3">
                        {items.map((item) => {
                          if (item.kind === 'roadmap' && item.dedicatedPage) {
                            return (
                              <Card
                                key={item.id}
                                className="card-elevated col-span-full rounded-xl border-border/80 md:col-span-2"
                              >
                                <CardHeader className="flex flex-row items-start gap-3.5 p-5 md:p-6">
                                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/80 text-primary">
                                    <MapIcon className="size-5" aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-base font-medium">{item.title}</h3>
                                      {item.featured && (
                                        <Badge
                                          variant="outline"
                                          className="rounded-md border-primary/20 bg-primary/8 font-normal text-primary"
                                        >
                                          推荐
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                      {item.description}
                                    </p>
                                    {item.tracks && item.tracks.length > 0 && (
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        共享 {item.steps.length} 步 · {item.tracks.length} 条分支
                                      </p>
                                    )}
                                    <Button asChild variant="outline" className="mt-4 h-11 rounded-xl">
                                      <Link to={roadmapPagePath('solana', item.id)}>
                                        进入路线页
                                        <ArrowRight className="size-4" aria-hidden="true" />
                                      </Link>
                                    </Button>
                                  </div>
                                </CardHeader>
                              </Card>
                            )
                          }
                          return (
                            <ItemCard
                              key={item.id}
                              item={item}
                              expanded={expandedIds.has(item.id)}
                              onExpandedChange={(expanded) => {
                                setExpandedIds((previous) => {
                                  const next = new Set(previous)
                                  if (expanded) next.add(item.id)
                                  else next.delete(item.id)
                                  return next
                                })
                              }}
                            />
                          )
                        })}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-2 px-5 py-6 text-sm text-muted-foreground sm:px-8">
          <p>Solana 专题 · Link Hub 站内页面</p>
          <Link to="/" className="hover:text-foreground">
            返回 Link Hub 首页
          </Link>
        </div>
      </footer>
    </div>
  )
}
