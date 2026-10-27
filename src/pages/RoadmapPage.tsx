import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BookOpen, Download, LoaderCircle } from 'lucide-react'
import { useLinks } from '../hooks/useLinks'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getResourceActions } from '../lib/resourcePresentation'
import { topicHubPath } from '../lib/routes'
import type { RoadmapItem, RoadmapStep } from '../lib/schema'
import { ThemeToggle } from '../components/ThemeToggle'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

function StepList({ steps, headingLevel = 3 }: { steps: RoadmapStep[]; headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li
          key={`${step.title}-${index}`}
          className="relative rounded-xl border border-border/70 bg-card p-4 pl-14 sm:pl-16"
        >
          <span
            className="absolute top-4 left-4 flex size-7 items-center justify-center rounded-lg border border-border/80 bg-background text-sm font-medium text-primary shadow-sm"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Heading className="text-base font-semibold">{step.title}</Heading>
            {step.optional && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                可选
              </Badge>
            )}
            {step.effort && <span className="text-xs text-muted-foreground">{step.effort}</span>}
          </div>
          {step.description && (
            <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>
          )}
          {step.outcome && (
            <p className="mt-2 text-sm leading-6">
              <span className="text-muted-foreground">产出：</span>
              <span>{step.outcome}</span>
            </p>
          )}
          {step.resources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-5">
              {step.resources.flatMap((resource) =>
                getResourceActions(resource).map((action) => (
                  <Button
                    key={`${resource.title}-${action.href}`}
                    asChild
                    variant="link"
                    className="h-auto min-h-10 max-w-full justify-start gap-2 px-0 py-1.5 text-sm font-normal"
                  >
                    <a
                      href={action.href}
                      download={action.download || undefined}
                      target={action.download ? undefined : '_blank'}
                      rel={action.download ? undefined : 'noopener noreferrer'}
                    >
                      <span className="underline decoration-primary/25 underline-offset-4">
                        {resource.title}
                        {action.download && `（${action.label}）`}
                      </span>
                      {action.download ? (
                        <Download className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      )}
                    </a>
                  </Button>
                )),
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

export function RoadmapPage() {
  const { topicId = '', roadmapId = '' } = useParams()
  const links = useLinks()
  const data = links.status === 'ready' ? links.data : undefined
  const item = data?.items.find(
    (entry): entry is RoadmapItem =>
      entry.kind === 'roadmap' && entry.id === roadmapId && entry.topic === topicId,
  )
  const tracks = item?.tracks ?? []
  const [activeTrack, setActiveTrack] = useState<string | undefined>(undefined)
  const selectedTrack = useMemo(() => {
    if (!tracks.length) return undefined
    const id = activeTrack && tracks.some((t) => t.id === activeTrack) ? activeTrack : tracks[0].id
    return tracks.find((t) => t.id === id)
  }, [tracks, activeTrack])

  useDocumentMeta(
    item ? `${item.title} · Link Hub` : '学习路线 · Link Hub',
    item?.description,
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="min-w-0">
            <Link
              to={topicId ? topicHubPath(topicId) : '/'}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {topicId === 'solana' ? '返回 Solana Hub' : '返回'}
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[800px] flex-1 px-5 py-8 sm:px-8 md:py-10">
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
        {data && !item && (
          <div className="py-16 text-center">
            <h1 className="text-xl font-semibold">未找到这条路线</h1>
            <Button asChild variant="outline" className="mt-6 h-12 rounded-md px-5">
              <Link to={topicId ? topicHubPath(topicId) : '/'}>返回</Link>
            </Button>
          </div>
        )}
        {item && (
          <>
            <header className="mb-10">
              <h1 className="text-3xl font-semibold tracking-tight">{item.title}</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {item.audience && <span>{item.audience}</span>}
                {item.estimatedEffort && <span>预计：{item.estimatedEffort}</span>}
              </div>
            </header>

            <section className="mb-12">
              <h2 className="text-lg font-semibold">共享基础</h2>
              <p className="mt-1 text-sm text-muted-foreground">所有分支开始前建议完成</p>
              <div className="mt-5">
                <StepList steps={item.steps} />
              </div>
            </section>

            {tracks.length > 0 && selectedTrack && (
              <section>
                <h2 className="text-lg font-semibold">选择分支</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  按目标深入一条赛道；其他分支可稍后再补
                </p>
                <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="路线分支">
                  {tracks.map((track) => {
                    const selected = track.id === selectedTrack.id
                    return (
                      <button
                        key={track.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveTrack(track.id)}
                        className={
                          selected
                            ? 'rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary'
                            : 'rounded-xl border border-border/80 bg-card px-3 py-2 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground'
                        }
                      >
                        {track.title}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 rounded-2xl border border-border/80 bg-muted/20 p-5">
                  <h3 className="text-base font-semibold">{selectedTrack.title}</h3>
                  {selectedTrack.description && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {selectedTrack.description}
                    </p>
                  )}
                  <div className="mt-5">
                    <StepList steps={selectedTrack.steps} headingLevel={4} />
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
