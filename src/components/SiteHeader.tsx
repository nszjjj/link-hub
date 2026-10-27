import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Library, Search, X } from 'lucide-react'
import type { UseLinkFiltersResult } from '../hooks/useLinkFilters'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { TagFilter } from './TagFilter'

type SiteHeaderProps = {
  filters: UseLinkFiltersResult
  currentTopic?: string
  headerRef?: Ref<HTMLElement>
  tagBarRef?: Ref<HTMLDivElement>
}

export function SiteHeader({ filters, currentTopic, headerRef, tagBarRef }: SiteHeaderProps) {
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const mobileSearch = useRef<HTMLInputElement>(null)
  const searchId = useId()
  const mobileSearchVisible = searchOpen || filters.keyword.length > 0

  useEffect(() => {
    if (searchOpen) mobileSearch.current?.focus()
  }, [searchOpen])

  const searchField = (mobile: boolean) => (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={mobile ? mobileSearch : undefined}
        id={`${searchId}-${mobile ? 'mobile' : 'desktop'}`}
        type="search"
        aria-label="搜索资源"
        placeholder="搜索资源、书名或阶段…"
        enterKeyHint="search"
        value={filters.keyword}
        onChange={(event) => filters.setKeyword(event.target.value)}
        className="h-12 rounded-md border-border bg-card pr-12 pl-10 text-sm shadow-none [&::-webkit-search-cancel-button]:hidden"
      />
      {filters.keyword && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="清除关键词"
          onClick={() => filters.setKeyword('')}
          className="absolute top-0 right-0 size-12 rounded-md text-muted-foreground"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )

  return (
    <>
      {/* 用稳定的核心栏承载高频操作；移动端不把完整标签面板固定在屏幕上。 */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-8 md:flex-nowrap md:py-4">
          <div className="min-w-0 flex-1 md:min-w-40 md:flex-none">
            <a
              href={import.meta.env.BASE_URL}
              className="inline-flex min-h-12 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
            >
              <Library className="size-5 text-primary" aria-hidden="true" />
              <h1 className="text-lg font-semibold tracking-tight">Link Hub</h1>
            </a>
            <p className="mt-1 hidden truncate text-sm text-muted-foreground md:block">
              {currentTopic ? (
                <>
                  <span className="sr-only">当前主题：</span>
                  {currentTopic}
                </>
              ) : (
                '个人主题导航'
              )}
            </p>
          </div>
          <div className="hidden min-w-0 flex-1 md:block">{searchField(false)}</div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              filters.keyword ? '聚焦搜索' : mobileSearchVisible ? '收起搜索' : '展开搜索'
            }
            aria-expanded={mobileSearchVisible}
            aria-controls={`${searchId}-mobile-panel`}
            onClick={() => {
              if (mobileSearchVisible && !filters.keyword) setSearchOpen(false)
              else {
                setSearchOpen(true)
                mobileSearch.current?.focus()
              }
            }}
            className="size-12 rounded-md text-muted-foreground md:hidden"
          >
            <Search aria-hidden="true" />
          </Button>
          {mobileSearchVisible && (
            <div id={`${searchId}-mobile-panel`} className="w-full md:hidden">
              {searchField(true)}
            </div>
          )}

        </div>
      </header>
      {!filters.topicId && <TagFilter
        filters={filters}
        expanded={tagsExpanded}
        onExpandedChange={setTagsExpanded}
        stickyRef={tagBarRef}
      />}
    </>
  )
}
