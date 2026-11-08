import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"

import { keys, local } from "./config"
import { readShared, writeShared } from "./shared"

/* The rail in the order it was dragged into.

   A tile is picked up by pressing on it and moving, and the others slide
   apart to show where it will land; a press that does not move is still a
   click, and Escape puts it back. Alt with an arrow moves the focused tile one
   place. With a lab server (see `serve.py`) the order is kept there beside
   the statuses, keyed `rail-order/<id>`, so everyone with the link sees one
   rail, and the last copy is held in the browser so the rail is in order from
   the first frame. A lab the order has never seen goes at the
   end, in file order.

   The rail is then cut by where the work stands: what is in progress or in
   review on top, what has not started under it, and what is done folded away
   at the foot. Each run drags within itself. */

/** How far a press travels before it is a drag rather than a click. */
const SLOP = 4

const EASE = "transform 160ms cubic-bezier(0.2, 0, 0, 1)"

/** Which rails have their done labs shown, per browser. */
const DONE_OPEN = () => local("rail-done-open")

export function useRailOrder(ids: string[]) {
  const key = keys.railOrder()
  const cache = local("rail-order")
  const [order, setOrder] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(cache) ?? "[]")
    } catch {
      return []
    }
  })

  function keep(next: string[]) {
    try {
      localStorage.setItem(cache, JSON.stringify(next))
    } catch {
      /* Held for this visit only. */
    }
  }

  useEffect(() => {
    let live = true
    readShared()
      .then((held) => {
        const saved = held?.[key]
        if (!live || typeof saved !== "string") return
        const next = saved.split(",")
        setOrder(next)
        keep(next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const at = (id: string) => {
    const i = order.indexOf(id)
    return i < 0 ? order.length + ids.indexOf(id) : i
  }

  function sort<T extends { id: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => at(a.id) - at(b.id))
  }

  /** A run of the rail in its new order, put back among the rest. */
  function move(run: string[]) {
    const moved = new Set(run)
    let k = 0
    const next = [...ids].sort((a, b) => at(a) - at(b)).map((id) => (moved.has(id) ? run[k++] : id))
    setOrder(next)
    keep(next)
    writeShared(key, next.join(","))
  }

  return { sort, move }
}

/** A rail cut into its runs. The fold stays shut when a done lab is the one
    open, and that one tile shows under it, so a lab can be worked on from Done
    without the whole of Done coming back. `rail` names this fold to the
    browser. */
export function RailRuns<T extends { id: string }>({ rail, items, picked, stage, onMove, onFold, children }: { rail: string; items: T[]; picked: string; stage: (id: string) => string | undefined; onMove: (ids: string[]) => void; onFold?: () => void; children: (item: T, lifted: boolean) => ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(() => {
    try {
      return !!JSON.parse(localStorage.getItem(DONE_OPEN()) ?? "{}")[rail]
    } catch {
      return false
    }
  })
  function toggle() {
    setOpen(!open)
    try {
      localStorage.setItem(DONE_OPEN(), JSON.stringify({ ...JSON.parse(localStorage.getItem(DONE_OPEN()) ?? "{}"), [rail]: !open }))
    } catch {
      /* Held for this visit only. */
    }
  }

  const going = items.filter((f) => stage(f.id) === "doing" || stage(f.id) === "review")
  const done = items.filter((f) => stage(f.id) === "done")
  const waiting = items.filter((f) => !going.includes(f) && !done.includes(f))

  /* A lab that changes run lands somewhere else on the rail, which may be out
     of sight. */
  const run = stage(picked) ?? ""
  useEffect(() => {
    box.current?.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest" })
  }, [run])

  useEffect(() => onFold?.(), [open])

  return (
    <div ref={box} className="contents">
      <RailList items={going} onMove={onMove}>{children}</RailList>
      <RailList items={waiting} onMove={onMove}>{children}</RailList>
      {done.length > 0 && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          title={open ? "Fold the done labs away" : `${done.length} done`}
          className="mt-1 flex w-12 cursor-pointer flex-col items-center gap-1 rounded-md py-1 text-(--lab-muted) outline-none hover:text-(--lab-ink) focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
        >
          <span className="flex items-center gap-0.5">
            <Check className="size-3.5" strokeWidth={1.75} />
            <ChevronDown className={`size-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </span>
          <span className="text-[11px] leading-[14px]">
            Done <span key={done.length} className="tabular-nums lab-fade">{done.length}</span>
          </span>
        </button>
      )}
      <div className={`flex flex-col items-center gap-3 ${open ? "lab-pop" : ""}`}>
        <RailList items={open ? done : done.filter((f) => f.id === picked)} onMove={onMove}>{children}</RailList>
      </div>
    </div>
  )
}

type Drag = { id: string; from: number; to: number; dy: number; size: number; settle?: boolean }

/** A run of tiles that can be dragged among themselves. Each is wrapped in a
    holder that carries the drag, so the tile itself stays as it is drawn. */
export function RailList<T extends { id: string }>({ items, onMove, children }: { items: T[]; onMove: (ids: string[]) => void; children: (item: T, lifted: boolean) => ReactNode }) {
  const ids = items.map((f) => f.id)
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const [drag, setDrag] = useState<Drag | null>(null)
  const focus = useRef<string>(undefined)

  useEffect(() => {
    if (!focus.current) return
    nodes.current.get(focus.current)?.querySelector("button")?.focus()
    focus.current = undefined
  })

  function reorder(from: number, to: number) {
    const next = [...ids]
    next.splice(to, 0, ...next.splice(from, 1))
    onMove(next)
  }

  function down(e: React.PointerEvent, id: string) {
    if (e.button !== 0 || ids.length < 2) return
    const from = ids.indexOf(id)
    const rects = ids.map((i) => nodes.current.get(i)!.getBoundingClientRect())
    const gap = from < rects.length - 1 ? rects[from + 1].top - rects[from].bottom : rects[from].top - rects[from - 1].bottom
    const size = rects[from].height + gap
    const mid = (r: DOMRect) => (r.top + r.bottom) / 2
    const start = e.clientY
    let moving = false
    let to = from

    function move(ev: PointerEvent) {
      const raw = ev.clientY - start
      if (!moving) {
        if (Math.abs(raw) < SLOP) return
        moving = true
        document.documentElement.dataset.railDrag = ""
      }
      const dy = Math.min(Math.max(raw, rects[0].top - rects[from].top), rects[rects.length - 1].bottom - rects[from].bottom)
      const centre = mid(rects[from]) + dy
      /* Held at the run's ends, a tile's centre can only meet the end tile's,
         never pass it, so meeting is enough to take its place. */
      to = from
      for (let i = from + 1; i < rects.length && centre >= mid(rects[i]); i++) to = i
      for (let i = from - 1; i >= 0 && centre <= mid(rects[i]); i--) to = i
      setDrag({ id, from, to, dy, size })
    }

    function end(put: boolean) {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
      window.removeEventListener("keydown", key)
      delete document.documentElement.dataset.railDrag
      if (!moving) return
      /* The press was a drag, so the click it ends in opens nothing. */
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation()
        ev.preventDefault()
      }
      window.addEventListener("click", swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener("click", swallow, true))
      /* It slides into its slot, then the rail takes the new order. */
      const land = put ? to : from
      const dy = land > from ? rects[land].bottom - rects[from].bottom : rects[land].top - rects[from].top
      setDrag({ id, from, to: land, dy, size, settle: true })
      setTimeout(() => {
        if (land !== from) reorder(from, land)
        setDrag(null)
      }, 160)
    }

    const up = () => end(true)
    const cancel = () => end(false)
    function key(ev: KeyboardEvent) {
      if (ev.key === "Escape") end(false)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    window.addEventListener("keydown", key)
  }

  function keyed(e: React.KeyboardEvent, id: string) {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return
    e.preventDefault()
    const from = ids.indexOf(id)
    const to = from + (e.key === "ArrowUp" ? -1 : 1)
    if (to < 0 || to >= ids.length) return
    focus.current = id
    reorder(from, to)
  }

  function offset(id: string, i: number) {
    if (!drag) return 0
    if (id === drag.id) return drag.dy
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.size
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return drag.size
    return 0
  }

  return (
    <>
      <style>{"[data-rail-drag], [data-rail-drag] * { cursor: grabbing !important; user-select: none !important; }"}</style>
      {items.map((f, i) => {
        const y = offset(f.id, i)
        const held = drag?.id === f.id
        const lifted = held && !drag.settle
        return (
          <div
            key={f.id}
            ref={(el) => {
              if (el) nodes.current.set(f.id, el)
              else nodes.current.delete(f.id)
            }}
            onPointerDown={(e) => down(e, f.id)}
            onKeyDown={(e) => keyed(e, f.id)}
            style={{
              transform: y ? `translateY(${y}px)` : undefined,
              transition: drag && (!held || drag.settle) ? EASE : undefined,
              zIndex: held ? 10 : undefined,
            }}
            className="relative flex flex-col items-center"
          >
            {children(f, lifted)}
          </div>
        )
      })}
    </>
  )
}
