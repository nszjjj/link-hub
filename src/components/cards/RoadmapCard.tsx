import { ArrowRight, ArrowUpRight, Download, Map } from 'lucide-react'
import type { RoadmapItem } from '../../lib/schema'
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
  return (
    <Accordion
      type="single"
      collapsible
      value={expanded ? item.id : ''}
      onValueChange={(value) => onExpandedChange(Boolean(value))}
      className="col-span-full"
    >
      <AccordionItem value={item.id} className="border-0">
        {/* 路线占满整行，用线性阶段表达学习顺序，不挤进网站网格。 */}
        <Card className="gap-0 rounded-lg border border-border bg-card py-0 wrap-anywhere shadow-none ring-0">
          <CardHeader className="flex flex-row items-start gap-3 rounded-t-lg p-5 pb-3 md:p-6 md:pb-3">
            <Map className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Heading className="min-w-0 max-w-full text-base leading-6 font-medium wrap-break-word">
                  {item.title}
                </Heading>
                {item.featured && (
                  <Badge
                    variant="outline"
                    className="rounded-md border-primary/15 bg-accent font-normal text-primary"
                  >
                    推荐
                  </Badge>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground wrap-break-word">
                <span className="text-foreground">{item.steps.length} 个阶段</span> ·{' '}
                {item.description}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-3 md:px-6">
            {(item.audience || item.estimatedEffort) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm leading-6 text-muted-foreground">
                {item.audience && <span>{item.audience}</span>}
                {item.estimatedEffort && <span>预计投入：{item.estimatedEffort}</span>}
              </div>
            )}
            <ol
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-muted-foreground"
              aria-label="阶段预览"
            >
              {item.steps.slice(0, 2).map((step, index) => (
                <li key={index} className="inline-flex min-w-0 items-center gap-2">
                  {index > 0 && (
                    <ArrowRight
                      className="size-3.5 shrink-0 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                  )}
                  <span>{step.title}</span>
                </li>
              ))}
              {item.steps.length > 2 && (
                <li className="text-muted-foreground/80">+{item.steps.length - 2}</li>
              )}
            </ol>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-2 rounded-b-lg border-t-0 bg-transparent px-5 pt-1 pb-4 md:px-6">
            <ItemTags tags={item.tags} />
            <div className="shrink-0">
              <AccordionTrigger
                headingLevel={headingLevel}
                className="min-h-12 items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-accent hover:no-underline"
              >
                {expanded ? '收起路线' : '展开全部'}
              </AccordionTrigger>
            </div>
          </CardFooter>
          <AccordionContent className="h-auto border-t border-border px-5 pt-6 pb-6 md:px-6 [&_a]:no-underline [&_p:not(:last-child)]:mb-0">
            <ol className="ml-3 border-l border-border">
              {item.steps.map((step, index) => (
                <li key={`${step.title}-${index}`} className="relative pb-7 pl-7 last:pb-0">
                  <span
                    className="absolute top-0 -left-3.5 flex size-7 items-center justify-center rounded-md border border-border bg-card text-sm font-medium text-primary"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <DetailHeading className="pt-0.5 text-base leading-6 font-semibold wrap-break-word">
                    {step.title}
                  </DetailHeading>
                  {step.description && (
                    <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                  {step.resources.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-5">
                      {step.resources.flatMap((resource) =>
                        getResourceActions(resource).map((action) => (
                          <Button
                            key={`${resource.title}-${action.href}`}
                            asChild
                            variant="link"
                            className="h-auto min-h-12 max-w-full justify-start gap-2 rounded-md px-0 py-2 text-sm font-normal whitespace-normal"
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
