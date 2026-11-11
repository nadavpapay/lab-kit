import { useEffect, useRef, useState } from "react"
import { ChevronRight } from "lucide-react"

/* How a lab's drawer is cut and walked, the same in every lab.

   A part belongs to the round its heading or name says. Only the newest round
   stays out; every round before it folds into Archive, newest first, and a
   lab says nothing for that to happen. A part that names no round stays out
   whatever else is there: Final, Reference, Everything picked. A lab cut by
   topic (Sources, Urgency) keeps each topic's own newest round out.

   A lab opens where it was left, unless a newer round has landed since, and
   otherwise on its newest round.

   The keys are the same everywhere: the numbers and left and right move
   between the options of a round, up and down between the rows of the
   drawer. A page that uses the arrows for itself calls `useOwnArrows`. */

export type Row = { id: string; name: string; group?: string; sub?: string; next?: boolean; archived?: boolean; final?: boolean }

const ROUND = /^Round (\d+)/

/** The round a part belongs to, or 0 if it names none. */
export function roundNumber(p: Row): number {
  const m = (p.sub ?? p.group)?.match(ROUND) ?? p.name.match(ROUND)
  return m ? Number(m[1]) : 0
}

/** A lab cut by topic keeps a newest round per topic; a heading that is a
    round, or only says earlier, is no topic. */
export const topicOf = (p: Row) => (!p.group || p.group === "Earlier" || ROUND.test(p.group) ? "" : p.group)

/** The drawer's two runs: what stays out, and the earlier rounds, newest first. */
export function arrange<T extends Row>(parts: readonly T[]): { live: T[]; archive: T[] } {
  const tops = new Map<string, number>()
  for (const p of parts) {
    if (p.next) continue
    const t = topicOf(p)
    tops.set(t, Math.max(tops.get(t) ?? 0, roundNumber(p)))
  }
  const old = (p: T) => !p.next && !p.final && (p.archived || roundNumber(p) < (tops.get(topicOf(p)) ?? 0)) && (!!p.archived || roundNumber(p) > 0)
  const topics = [...tops.keys()]
  return {
    live: parts.filter((p) => !old(p)),
    archive: parts.filter(old).sort((a, b) => topics.indexOf(topicOf(a)) - topics.indexOf(topicOf(b)) || roundNumber(b) - roundNumber(a)),
  }
}

/** The part a lab opens on: its newest round's first, else its first. */
export function newest<T extends Row>(parts: readonly T[]): T {
  const open = parts.filter((p) => !p.next && p.id !== "starred")
  const top = Math.max(0, ...open.map(roundNumber))
  return open.find((p) => roundNumber(p) === top) ?? open[0] ?? parts[0]
}

/** Where each lab was left, per browser, with the newest round it had then. */
export function useLastPlace(store: string) {
  const held = useRef<Record<string, { part: string; top: string }> | undefined>(undefined)
  function all() {
    if (!held.current) {
      try {
        held.current = JSON.parse(localStorage.getItem(store) ?? "{}")
      } catch {
        held.current = {}
      }
    }
    return held.current!
  }
  return {
    keep(feature: string, part: string, top: string) {
      const places = all()
      if (places[feature]?.part === part && places[feature]?.top === top) return
      places[feature] = { part, top }
      try {
        localStorage.setItem(store, JSON.stringify(places))
      } catch {
        /* Held for this visit only. */
      }
    },
    /** The part to open a lab on, or nothing for its opening part. */
    recall(feature: string, parts: readonly Row[]): string {
      const was = all()[feature]
      return was && was.top === newest(parts).id && parts.some((p) => p.id === was.part && !p.next) ? was.part : ""
    },
  }
}

/** Whether Archive shows: asked for, or holding the part on screen. Asked for
    is kept per browser. */
export function useArchive(store: string, feature: string, holding: boolean): [boolean, () => void] {
  const [asked, setAsked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(store) ?? "{}")
    } catch {
      return {}
    }
  })
  function toggle() {
    if (holding) return
    setAsked((a) => {
      const next = { ...a, [feature]: !a[feature] }
      try {
        localStorage.setItem(store, JSON.stringify(next))
      } catch {
        /* Held for this visit only. */
      }
      return next
    })
  }
  return [holding || !!asked[feature], toggle]
}

/** The row that folds the earlier rounds, with how many there are. */
export function ArchiveRow({ parts, open, holding, onToggle }: { parts: readonly Row[]; open: boolean; holding: boolean; onToggle: () => void }) {
  const count = new Set(parts.map((p) => `${topicOf(p)}|${roundNumber(p) || p.id}`)).size
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={holding ? "Holds the round on screen" : open ? "Fold the earlier rounds away" : `${count} earlier ${count === 1 ? "round" : "rounds"}`}
      className={`mt-3 flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-left text-[13px] leading-[18px] text-(--lab-quiet) outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring) ${holding ? "cursor-default" : "cursor-pointer hover:bg-black/[0.04] hover:text-(--lab-ink)"}`}
    >
      <ChevronRight aria-hidden className={`size-3.5 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
      Archive
      <span className="ml-auto text-[11px] leading-[14px] tabular-nums">{count}</span>
    </button>
  )
}

/* ── Keys ─────────────────────────────────────────────────────────────── */

let owned = 0

/** Keeps the arrows for the page on screen, while it is drawn. */
export function useOwnArrows(on = true) {
  useEffect(() => {
    if (!on) return
    owned += 1
    return () => {
      owned -= 1
    }
  }, [on])
}

export const arrowsOwned = () => owned > 0

/** Whether a key is being typed somewhere rather than pressed at the lab. */
export const typing = (e: KeyboardEvent) => {
  const el = e.target
  return el instanceof HTMLElement && !!el.closest("input, textarea, select, [contenteditable], [role=slider], [role=listbox], [role=menu]")
}

/** Up and down walk the drawer's rows, through Archive too. */
export function useRowKeys(rows: readonly string[], at: string, go: (id: string) => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || typing(e) || owned > 0) return
      const to = rows[rows.indexOf(at) + (e.key === "ArrowDown" ? 1 : -1)]
      if (!to) return
      /* Once every other listener has had the key: a page that took it says so. */
      setTimeout(() => {
        if (!e.defaultPrevented) go(to)
      })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
}

/** The numbers and left and right move between a round's options. A lab
    that already moves on the key has moved by the time this looks, so a key
    is never taken twice. */
export function useOptionKeys(ids: readonly string[] | undefined, picked: string | undefined, onPick: ((id: string) => void) | undefined) {
  const now = useRef(picked)
  now.current = picked
  useEffect(() => {
    if (!ids || ids.length < 2 || !onPick) return
    const list = ids
    const pick = onPick
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || typing(e)) return
      const arrow = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
      if (arrow && owned > 0) return
      const at = list.indexOf(picked!)
      const to = arrow ? (at + arrow + list.length) % list.length : /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1
      if (to < 0 || to >= list.length) return
      setTimeout(() => {
        if (now.current === picked && !e.defaultPrevented) pick(list[to])
      })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
}
