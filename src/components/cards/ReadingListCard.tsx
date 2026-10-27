import { ArrowUpRight, BookOpen, Download } from 'lucide-react'
import type { ReadingListItem } from '../../lib/schema'
import { getReadingLabels, getResourceActions } from '../../lib/resourcePresentation'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card'

type ReadingListCardProps = {
  item: ReadingListItem
  headingLevel?: 3 | 4
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

export function ReadingListCard({
  item,
  headingLevel = 3,
  expanded,
  onExpandedChange,
}: ReadingListCardProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  const DetailHeading = headingLevel === 3 ? 'h4' : 'h5'
  const labels = getReadingLabels(item.books)
  return (
    <Accordion
      type="single"
      collapsible
      value={expanded ? item.id : ''}
      onValueChange={(value) => onExpandedChange(Boolean(value))}
    >
      <AccordionItem value={item.id} className="border-0">
        <Card className="gap-0 rounded-lg border border-border bg-card py-0 wrap-anywhere shadow-none ring-0">
          <CardHeader className="flex flex-row items-start gap-3 rounded-t-lg p-5 pb-3">
            <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
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
                {item.description}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pb-3">
            {item.audience && (
              <p className="text-sm leading-6 text-muted-foreground">{item.audience}</p>
            )}
            <p className="text-sm leading-6">
              <span>共 {item.books.length} 本</span>
              {labels.length > 0 && (
                <span className="ml-2 text-muted-foreground">{labels.join('，')}</span>
              )}
            </p>
            {/* 折叠态先给阅读起点，访客无需展开才能判断这份书单是否有用。 */}
            <p
              className="truncate text-sm leading-6 text-muted-foreground"
              title={item.books[0].title}
            >
              先读：<span className="text-foreground">{item.books[0].title}</span>
            </p>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-2 rounded-b-lg border-t-0 bg-transparent px-5 pt-1 pb-4">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-auto min-h-6 rounded-md bg-muted font-normal text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="shrink-0">
              <AccordionTrigger
                headingLevel={headingLevel}
                className="min-h-12 items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-accent hover:no-underline"
              >
                {expanded ? '收起书单' : '展开书单'}
              </AccordionTrigger>
            </div>
          </CardFooter>
          <AccordionContent className="h-auto border-t border-border px-5 pt-2 pb-5 [&_a]:no-underline [&_p:not(:last-child)]:mb-0">
            <ol className="divide-y divide-border">
              {item.books.map((book, index) => (
                <li key={`${book.title}-${index}`} className="py-4 last:pb-0">
                  <DetailHeading className="text-sm leading-6 font-medium wrap-break-word">
                    《{book.title}》
                    {book.author && (
                      <span className="font-normal text-muted-foreground"> — {book.author}</span>
                    )}
                  </DetailHeading>
                  {book.note && (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{book.note}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getResourceActions(book).map((action) => (
                      <Button
                        key={action.href}
                        asChild
                        variant="outline"
                        className="h-12 gap-2 rounded-md px-3 font-normal shadow-none"
                      >
                        <a
                          href={action.href}
                          download={action.download || undefined}
                          target={action.download ? undefined : '_blank'}
                          rel={action.download ? undefined : 'noopener noreferrer'}
                          aria-label={`${action.label}：${book.title}${action.download ? '' : '，在新标签页打开'}`}
                        >
                          {action.download ? (
                            <Download aria-hidden="true" />
                          ) : (
                            <ArrowUpRight aria-hidden="true" />
                          )}
                          {action.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  )
}
