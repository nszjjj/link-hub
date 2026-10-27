import { useEffect, useState } from 'react'

export function useActiveTopic(
  topicIds: readonly string[],
  stickyOffset: number,
): string | undefined {
  const [activeId, setActiveId] = useState<string>()
  useEffect(() => {
    const sections = topicIds.map((id) => document.getElementById(`topic-${id}`))
    let frame: number | undefined
    const update = () => {
      let next: string | undefined = topicIds[0]
      sections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= stickyOffset + 24)
          next = topicIds[index]
      })
      if (
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      )
        next = topicIds.at(-1)
      setActiveId((previous) => (previous === next ? previous : next))
    }
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(update, {
            rootMargin: `-${stickyOffset}px 0px 0px 0px`,
            threshold: [0, 1],
          })
    sections.forEach((section) => {
      if (section) observer?.observe(section)
    })
    const schedule = () => {
      if (frame !== undefined) return
      frame = requestAnimationFrame(() => {
        frame = undefined
        update()
      })
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      observer?.disconnect()
      if (frame !== undefined) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [topicIds, stickyOffset])
  return activeId
}
