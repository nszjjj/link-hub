import { ArrowRight, ArrowUpRight, Download, Map } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { RoadmapItem } from '../../lib/schema'
import { roadmapPagePath } from '../../lib/routes'
import { getResourceActions } from '../../lib/resourcePresentation'
import { ItemTags } from '../ItemTags'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card'

type RoadmapCardProps = {
  item: RoadmapItem
  headingLevel?: 3 | 4
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

export function RoadmapCard({
  item,
  headingLevel = 3,
  expanded,
  onExpandedChange,
}: RoadmapCardProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  const DetailHeading = headingLevel === 3 ? 'h4' : 'h5'
  const requiredCount = item.steps.filter((step) => !step.optional).length
  const optionalCount = item.steps.length - requiredCount
  const trackCount = item.tracks?.length ?? 0

  if (item.dedicatedPage) {
    return (
      <Card className="card-elevated col-span-full gap-0 rounded-xl border border-border/80 bg-card py-0 wrap-anywhere ring-0">
        <CardHeader className="flex flex-row items-start gap-3.5 rounded-t-xl p-5 pb-3 md:p-6 md:pb-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/80 text-primary shadow-sm">
            <Map className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Heading className="min-w-0 max-w-full text-base leading-6 font-medium wrap-break-word">
                {item.title}
              </Heading>
              {item.featured && (
                <Badge
                  variant="outline"
                  className="rounded-md border-primary/20 bg-primary/8 font-normal text-primary"
                >
                  推荐
                </Badge>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground wrap-break-word">
              {item.description}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-3 md:px-6">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-muted-foreground">
            <span>
              <span className="text-foreground">{requiredCount}</span> 个基础阶段
              {trackCount > 0 && <span className="ml-1">· {trackCount} 条分支</span>}
              {optionalCount > 0 && <span className="ml-1">· {optionalCount} 个可选</span>}
            </span>
            {item.estimatedEffort && <span>整条约 {item.estimatedEffort}</span>}
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-2 rounded-b-xl border-t-0 bg-transparent px-5 pt-1 pb-4 md:px-6">
          <ItemTags tags={item.tags} />
          <Button asChild className="h-11 rounded-xl">
            <Link to={roadmapPagePath(item.topic, item.id)}>
              打开路线页
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={expanded ? item.id : ''}
      onValueChange={(value) => onExpandedChange(Boolean(value))}
      className="col-span-full"
    >
      <AccordionItem value={item.id} className="border-0">
        <Card className="card-elevated gap-0 rounded-xl border border-border/80 bg-card py-0 wrap-anywhere ring-0">
          <CardHeader className="flex flex-row items-start gap-3.5 rounded-t-xl p-5 pb-3 md:p-6 md:pb-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/80 text-primary shadow-sm">
              <Map className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Heading className="min-w-0 max-w-full text-base leading-6 font-medium wrap-break-word">
                  {item.title}
                </Heading>
                {item.featured && (
                  <Badge
                    variant="outline"
                    className="rounded-md border-primary/20 bg-primary/8 font-normal text-primary"
                  >
                    推荐
                  </Badge>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground wrap-break-word">
                {item.description}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-3 md:px-6">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-muted-foreground">
              <span>
                <span className="text-foreground">{requiredCount}</span> 个主阶段
                {optionalCount > 0 && (
                  <span className="ml-1">· {optionalCount} 个可选</span>
                )}
              </span>
              {item.estimatedEffort && <span>整条约 {item.estimatedEffort}</span>}
              {item.audience && <span>{item.audience}</span>}
            </div>
            <ol
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-muted-foreground"
              aria-label="阶段预览"
            >
              {item.steps.slice(0, 3).map((step, index) => (
                <li key={index} className="inline-flex min-w-0 items-center gap-2">
                  {index > 0 && (
                    <ArrowRight
                      className="size-3.5 shrink-0 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                  )}
                  <span className={step.optional ? 'opacity-70' : undefined}>
                    {step.title}
                    {step.optional ? '（可选）' : ''}
                  </span>
                </li>
              ))}
              {item.steps.length > 3 && (
                <li className="text-muted-foreground/80">+{item.steps.length - 3}</li>
              )}
            </ol>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-2 rounded-b-xl border-t-0 bg-transparent px-5 pt-1 pb-4 md:px-6">
            <ItemTags tags={item.tags} />
            <div className="shrink-0">
              <AccordionTrigger
                headingLevel={headingLevel}
                className="min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-accent hover:no-underline"
              >
                {expanded ? '收起路线' : '展开全部'}
              </AccordionTrigger>
            </div>
          </CardFooter>
          <AccordionContent className="h-auto border-t border-border/80 px-5 pt-5 pb-6 md:px-6 [&_a]:no-underline [&_p:not(:last-child)]:mb-0">
            <ol className="space-y-4">
              {item.steps.map((step, index) => (
                <li
                  key={`${step.title}-${index}`}
                  className="relative rounded-xl border border-border/70 bg-muted/30 p-4 pl-14 sm:pl-16"
                >
                  <span
                    className="absolute top-4 left-4 flex size-7 items-center justify-center rounded-lg border border-border/80 bg-card text-sm font-medium text-primary shadow-sm"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <DetailHeading className="text-base leading-6 font-semibold wrap-break-word">
                      {step.title}
                    </DetailHeading>
                    {step.optional && (
                      <Badge
                        variant="outline"
                        className="rounded-md border-border font-normal text-muted-foreground"
                      >
                        可选
                      </Badge>
                    )}
                    {step.effort && (
                      <span className="text-xs text-muted-foreground">{step.effort}</span>
                    )}
                  </div>
                  {step.description && (
                    <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                  {step.outcome && (
                    <p className="mt-2 text-sm leading-6">
                      <span className="text-muted-foreground">产出：</span>
                      <span className="text-foreground">{step.outcome}</span>
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
                            className="h-auto min-h-10 max-w-full justify-start gap-2 rounded-lg px-0 py-1.5 text-sm font-normal whitespace-normal"
                          >
                            <a
                              href={action.href}
                              download={action.download || undefined}
                              target={action.download ? undefined : '_blank'}
                              rel={action.download ? undefined : 'noopener noreferrer'}
                              aria-label={`${resource.title}，${action.label}${action.download ? '' : '，在新标签页打开'}`}
                            >
                              <span className="min-w-0 text-left wrap-break-word underline decoration-primary/25 underline-offset-4">
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
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  )
}
