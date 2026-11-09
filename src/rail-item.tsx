import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Check, type LucideIcon } from "lucide-react"

import { STATUSES, type Status } from "./status"
import { cn } from "./cn"

/* One lab on the rail, tinted by where the subject stands.

   In progress washes the tile in blue, in review in amber, done in green,
   and a dot on the tile's corner keeps saying it once the tile is picked and
   turns white. Not started is only an empty ring. A lab nobody has set is
   plain, so colour on the rail always means somebody said so.

   It is set on the tile itself: the corner dot comes up under the pointer and
   opens the choices, and so does a right-click anywhere on the tile. The
   choices are placed against the window rather than the tile: the rail
   scrolls, and a box that scrolls cuts off whatever sticks out of it, sideways
   too. So they close when the rail moves out from under them. */

/** The choices' distance from the rail, and from the foot of the window. */
const GAP = 8

const TONE: Record<Status, { tile: string; icon: string; dot: string }> = {
  todo: { tile: "", icon: "", dot: "border border-(--lab-quiet) bg-(--lab-rail)" },
  doing: { tile: "bg-(--lab-doing)/13", icon: "text-(--lab-doing)", dot: "bg-(--lab-doing)" },
  review: { tile: "bg-(--lab-review)/13", icon: "text-(--lab-review)", dot: "bg-(--lab-review)" },
  done: { tile: "bg-(--lab-done)/13", icon: "text-(--lab-done)", dot: "bg-(--lab-done)" },
}

export function RailItem({
  name,
  Icon,
  on,
  lifted,
  status,
  onOpen,
  onStatus,
}: {
  name: string
  Icon: LucideIcon
  on: boolean
  /** Picked up and being dragged along the rail. */
  lifted?: boolean
  status?: Status
  onOpen: () => void
  onStatus: (next: Status | null) => void
}) {
  const [menu, setMenu] = useState(false)
  const [at, setAt] = useState<{ top: number; left: number }>()
  const ref = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const tone = status ? TONE[status] : undefined
  const word = status ? STATUSES.find((s) => s.id === status)!.label : "No status"

  useLayoutEffect(() => {
    if (!menu || !ref.current || !sheet.current) return
    const tile = ref.current.getBoundingClientRect()
    const rail = ref.current.closest("nav")?.getBoundingClientRect() ?? tile
    const foot = window.innerHeight - sheet.current.offsetHeight - GAP
    setAt({ top: Math.max(GAP, Math.min(tile.top, foot)), left: rail.right + GAP })
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const rail = ref.current?.closest("nav")
    const close = () => setMenu(false)
    function away(e: PointerEvent) {
      const on = e.target as Node
      if (!sheet.current?.contains(on) && !dot.current?.contains(on)) close()
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("pointerdown", away)
    window.addEventListener("keydown", key)
    window.addEventListener("resize", close)
    rail?.addEventListener("scroll", close)
    return () => {
      window.removeEventListener("pointerdown", away)
      window.removeEventListener("keydown", key)
      window.removeEventListener("resize", close)
      rail?.removeEventListener("scroll", close)
    }
  }, [menu])

  function pick(next: Status | null) {
    onStatus(next)
    setMenu(false)
  }

  return (
    <div
      ref={ref}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu(true)
      }}
      className="group/f relative flex flex-col items-center"
    >
      <button type="button" onClick={onOpen} aria-current={on || undefined} className="group/b flex cursor-pointer flex-col items-center gap-1 outline-none">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-colors duration-150 group-focus-visible/b:ring-2 group-focus-visible/b:ring-(--lab-ring)",
            lifted
              ? "bg-(--lab-paper) text-(--lab-ink) shadow-[0_2px_4px_rgb(0_0_0/0.08),0_8px_20px_rgb(0_0_0/0.12)]"
              : on
              ? "bg-(--lab-paper) text-(--lab-ink) shadow-xs"
              : cn(tone?.tile, tone?.icon || "text-(--lab-muted)", "group-hover/f:text-(--lab-ink)", !tone?.tile && "group-hover/f:bg-black/[0.05]"),
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
        {/* The name stays inside the rail: it wraps and is cut after three
            lines, so a long one never widens the item past the rail's edge. */}
        <span
          className={cn(
            "w-[72px] text-center text-[11px] leading-[14px] text-balance line-clamp-3",
            on ? "text-(--lab-ink)" : "text-(--lab-quiet) group-hover/f:text-(--lab-muted)",
          )}
          title={name}
        >
          {name}
        </span>
      </button>

      {/* The corner dot, which is also where the status is changed. It is
          placed from the tile's centre rather than the item's edge, since a
          long name makes the item wider than the tile: the tile is 36px, so
          +16px is its right edge less the corner's curve, and the 16px hit
          box is centred there. */}
      <button
        ref={dot}
        type="button"
        onClick={() => setMenu((m) => !m)}
        title={`${word} · change`}
        aria-label={`${name}: ${word}. Change`}
        aria-expanded={menu}
        className={cn(
          "absolute -top-1.5 left-[calc(50%+8px)] flex size-4 cursor-pointer items-center justify-center rounded-full outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
          status || menu ? "opacity-100" : "opacity-0 group-hover/f:opacity-100 focus-visible:opacity-100",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full ring-2 ring-(--lab-rail) transition-transform duration-150 hover:scale-125",
            tone?.dot ?? "border border-dashed border-(--lab-quiet) bg-(--lab-rail)",
          )}
        />
      </button>

      {menu && (
        <div
          ref={sheet}
          role="menu"
          aria-label={`${name} status`}
          style={at}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed z-30 flex w-44 flex-col rounded-lg border border-(--lab-line) bg-(--lab-paper) p-1 text-(--lab-ink) shadow-md lab-pop"
        >
          <p className="m-0 px-2 pt-1 pb-1.5 text-[11px] leading-[14px] text-(--lab-quiet)">{name}</p>
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={s.id === status}
              onClick={() => pick(s.id)}
              className="flex h-7 cursor-pointer items-center gap-2 rounded-[5px] px-2 text-left text-xs outline-none hover:bg-(--lab-hover) focus-visible:bg-(--lab-hover)"
            >
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE[s.id].dot)} />
              <span className="flex-1">{s.label}</span>
              {s.id === status && <Check className="size-3 text-(--lab-muted)" />}
            </button>
          ))}
          {status && (
            <>
              <span className="my-1 h-px bg-(--lab-line)" />
              <button
                type="button"
                role="menuitem"
                onClick={() => pick(null)}
                className="flex h-7 cursor-pointer items-center rounded-[5px] px-2 text-left text-xs text-(--lab-muted) outline-none hover:bg-(--lab-hover) hover:text-(--lab-ink) focus-visible:bg-(--lab-hover)"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
