import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { SiteItem } from '../../lib/schema'
import { assetUrl } from '../../lib/paths'
import { ItemTags } from '../ItemTags'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card'

function SiteIcon({ item }: { item: SiteItem }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-sm font-medium text-primary"
      aria-hidden="true"
    >
      {item.icon && !failed ? (
        <img
          src={assetUrl(item.icon)}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-6 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        Array.from(item.title)[0].toUpperCase()
      )}
    </span>
  )
}

export function SiteCard({ item, headingLevel = 3 }: { item: SiteItem; headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${item.title}，在新标签页打开`}
      className="group block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* 整卡只包含一个链接；轻边框变化提供反馈，不用抬升阴影抢占主题层级。 */}
      <Card className="h-full gap-0 rounded-lg border border-border bg-card py-0 wrap-anywhere shadow-none ring-0 transition-colors group-hover:border-primary/40 group-hover:bg-accent/30 motion-reduce:transition-none">
        <CardHeader className="flex flex-row items-start gap-3 rounded-t-lg p-5 pb-3">
          <SiteIcon key={item.icon ?? item.id} item={item} />
          <div className="min-w-0 flex-1">
            <Heading className="text-base leading-6 font-medium wrap-break-word">
              {item.title}
            </Heading>
            {item.featured && (
              <Badge
                variant="outline"
                className="mt-2 rounded-md border-primary/15 bg-accent font-normal text-primary"
              >
                推荐
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 px-5 pb-4">
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </CardContent>
        <CardFooter className="justify-between gap-3 rounded-b-lg border-t-0 bg-transparent px-5 pt-0 pb-5">
          <ItemTags tags={item.tags} />
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
            aria-hidden="true"
          />
        </CardFooter>
      </Card>
    </a>
  )
}
