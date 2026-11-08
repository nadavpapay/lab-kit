import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Star } from "lucide-react"

/* Every option of a round at once, each drawn whole in its own frame, shrunk
   to its cell, over the round's stage and under its head. A click opens one;
   the arrows move between them and Enter opens the one marked. Each frame is
   the lab at the option's own address, so whatever is set in the head reaches
   every frame.

   Frames load as they come near the screen, and a lab that has its own lighter
   board keeps it. */

const FRAME = { w: 1280, h: 800 }

/** The narrowest a frame is drawn, so the columns give way before it is unreadable. */
const FRAME_MIN = 340

const GAP = 24

export type Seen = { id: string; name: string; hint?: string; title?: string }

export function SeeAll({
  head,
  picks,
  picked,
  src,
  onOpen,
  starred,
  onStar,
}: {
  /** The head it sits under, whose foot is the top of this view. */
  head: HTMLElement | null
  picks: Seen[]
  picked?: string
  src: (id: string) => string
  onOpen: (id: string) => void
  starred?: (id: string) => boolean
  onStar?: (p: Seen) => void
}): ReactNode {
  const room = head?.closest<HTMLElement>("[data-lab-room]")
  const [top, setTop] = useState(0)

  useLayoutEffect(() => {
    if (!head || !room) return
    const measure = () => setTop(head.getBoundingClientRect().bottom - room.getBoundingClientRect().top)
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(head)
    watch.observe(room)
    return () => watch.disconnect()
  }, [head, room])

  const grid = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = grid.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  })

  /* The marked one stays in view as the arrows walk past the fold. */
  useEffect(() => {
    grid.current?.querySelector("[data-marked]")?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [picked])

  if (!room) return null

  const cols = Math.max(1, Math.min(picks.length, Math.floor((width + GAP) / (FRAME_MIN + GAP))))
  const cell = Math.max(0, (width - GAP * (cols - 1)) / cols)
  const scale = cell / FRAME.w

  return createPortal(
    <div className="absolute inset-x-0 bottom-0 z-20 overflow-y-auto bg-(--lab-chrome) px-6 pt-1 pb-6 lab-fade" style={{ top }}>
      <div ref={grid} className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GAP }}>
        {cell > 0 &&
          picks.map((p, i) => {
            const on = p.id === picked
            const star = !!starred?.(p.id)
            return (
              <div key={p.id} data-marked={on || undefined} className="group relative min-w-0">
                <button type="button" onClick={() => onOpen(p.id)} title={p.title} className="group/open flex w-full min-w-0 cursor-pointer flex-col gap-2.5 text-left outline-none">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-(--lab-quiet)">{i + 1}</span>
                    <span className="truncate font-medium">{p.name}</span>
                    {p.hint && <span className="text-[11px] text-(--lab-quiet)">{p.hint}</span>}
                    {star && <Star aria-label="Starred" className="size-3 shrink-0 fill-(--lab-star) text-(--lab-star)" />}
                  </span>
                  <span
                    className={`relative block overflow-hidden rounded-lg bg-(--lab-rail) shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.08)] transition-[translate,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_14px_32px_rgb(0_0_0/0.14)] group-focus-visible/open:ring-2 group-focus-visible/open:ring-(--lab-ring) ${on ? "outline-2 outline-offset-2 outline-(--lab-ink)" : ""}`}
                    style={{ height: FRAME.h * scale }}
                  >
                    <iframe
                      src={src(p.id)}
                      title={p.name}
                      loading="lazy"
                      tabIndex={-1}
                      aria-hidden
                      className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
                      style={{ width: FRAME.w, height: FRAME.h, transform: `scale(${scale})` }}
                    />
                  </span>
                </button>
                {onStar && (
                  <button
                    type="button"
                    onClick={() => onStar(p)}
                    aria-pressed={star}
                    aria-label={star ? `Unstar ${p.name}` : `Star ${p.name}`}
                    title={star ? "Unstar" : "Star"}
                    className="absolute top-[calc(16px+10px+8px)] right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/95 opacity-0 shadow-[0_1px_2px_rgb(0_0_0/0.12),0_2px_8px_rgb(0_0_0/0.10)] outline-none transition-[opacity,translate] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-(--lab-ring) [@media(hover:none)]:opacity-100"
                  >
                    <Star className={`size-3.5 ${star ? "fill-(--lab-star) text-(--lab-star)" : "text-(--lab-quiet)"}`} />
                  </button>
                )}
              </div>
            )
          })}
      </div>
    </div>,
    room,
  )
}
