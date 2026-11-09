import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { cn } from "./cn"

/* What every part shares: the room under the head, a thing drawn as large as
   that room allows, and a small choice for the head. */

export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [ref])
  return size
}

/** The room under the head. `children` is given the scale that fits a
    `w`×`h` thing whole, never past `max`, and draws it at that scale. The
    thing is drawn from the top of the room: a round whose versions differ in
    height keeps its top edge in one place. */
export function Stage({ w, h, max = 1, foot, children }: { w: number; h: number; max?: number; foot?: ReactNode; children: (scale: number) => ReactNode }) {
  const room = useRef<HTMLDivElement>(null)
  const { width, height } = useSize(room)
  const scale = Math.min(width / w, height / h, max)
  return (
    <div className="mx-6 mb-4 flex min-h-0 flex-1 flex-col items-center gap-4">
      {/* The thing hangs from the top of the room, so switching between
          versions of different heights does not move it up and down. */}
      <div ref={room} className="flex min-h-0 w-full flex-1 items-start justify-center overflow-hidden">
        {scale > 0 && children(scale)}
      </div>
      {foot}
    </div>
  )
}

/** A small choice in the head, drawn as the lab's other head controls. */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-7 items-center rounded-md border border-(--lab-line) bg-(--lab-paper)/70 p-0.5">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex h-full cursor-pointer items-center rounded-[5px] px-2 text-xs leading-none outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
              on ? "bg-(--lab-ink) text-(--lab-paper)" : "text-(--lab-muted) hover:text-(--lab-ink)",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}


/** The whole room under the head, edge to edge, for a thing that should take
    all of it, such as a real page in a frame. `children` is given the room's
    width and height and draws at that size. */
export function Fill({ className, children }: { className?: string; children: (size: { width: number; height: number }) => ReactNode }) {
  const room = useRef<HTMLDivElement>(null)
  const size = useSize(room)
  return (
    <div ref={room} className={cn("relative min-h-0 flex-1 overflow-hidden", className)}>
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  )
}
