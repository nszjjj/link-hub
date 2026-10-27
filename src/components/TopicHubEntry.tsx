import { Link } from 'react-router-dom'
import { ArrowRight, LayoutTemplate } from 'lucide-react'
import { topicHubPath } from '../lib/routes'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader } from './ui/card'

type TopicHubEntryProps = {
  topicId: string
  topicName: string
  description?: string
  itemCount: number
  parentName?: string
}

/**
 * 首页上「已有独立 Hub」主题的入口卡。
 * 强调这是本站子页面，避免被当成外部导航站或外链。
 */
export function TopicHubEntry({
  topicId,
  topicName,
  description,
  itemCount,
  parentName,
}: TopicHubEntryProps) {
  return (
    <Card className="card-elevated col-span-full gap-0 rounded-xl border border-border/80 bg-card py-0 ring-0">
      <CardHeader className="flex flex-row items-start gap-3.5 p-5 pb-3 md:p-6 md:pb-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/80 text-primary shadow-sm">
          <LayoutTemplate className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-primary">
            Link Hub 站内专题页
          </p>
          <h4 className="mt-1 text-base font-medium leading-6">{topicName} 专题</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description ??
              `文档、工具与学习路线已整理到本站的 ${topicName} 子页面，避免在首页重复罗列。`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            这不是外部网站，而是当前导航站内的专题（
            {parentName ? `${parentName} → ` : ''}
            {topicName}），点进去仍在 Link Hub 中浏览。
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-2 md:px-6">
        <p className="text-sm text-muted-foreground">
          约 <span className="tabular-nums text-foreground">{itemCount}</span> 条资源 ·
          含路径与工具分区
        </p>
      </CardContent>
      <CardFooter className="px-5 pt-1 pb-5 md:px-6">
        <Button asChild className="h-11 rounded-xl">
          <Link to={topicHubPath(topicId)} aria-label={`进入本站 ${topicName} 专题页`}>
            进入本站 {topicName} 专题
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
