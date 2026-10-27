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
      className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/80 text-sm font-medium text-primary shadow-sm"
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
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="card-elevated h-full gap-0 rounded-xl border border-border/80 bg-card py-0 wrap-anywhere ring-0 transition-colors group-hover:border-primary/35 group-hover:bg-accent/40">
        <CardHeader className="flex flex-row items-start gap-3.5 rounded-t-xl p-5 pb-3">
          <SiteIcon key={item.icon ?? item.id} item={item} />
          <div className="min-w-0 flex-1">
            <Heading className="text-base leading-6 font-medium wrap-break-word group-hover:text-primary transition-colors">
              {item.title}
            </Heading>
            {item.featured && (
              <Badge
                variant="outline"
                className="mt-2 rounded-md border-primary/20 bg-primary/8 font-normal text-primary"
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
        <CardFooter className="justify-between gap-3 rounded-b-xl border-t-0 bg-transparent px-5 pt-0 pb-5">
          <ItemTags tags={item.tags} />
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        </CardFooter>
      </Card>
    </a>
  )
}
