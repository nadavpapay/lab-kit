import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Info, LayoutGrid, Lock, Star } from "lucide-react"

import { DialsMenu, type Dial } from "./dials"
import { useParam } from "./param"
import { typing, useOptionKeys } from "./rounds"
import { SeeAll } from "./see-all"
import { addressFor, starKey, useStarsHere } from "./stars"
import { cn } from "./cn"

/* The head every lab shares, kept short so the version below it is seen at
   close to its real size.

   It is one line. On the left, the link and an info mark that holds what the
   part asks and what the picked version does. Then the versions, each a chip
   with its letter, the picked one with its whole name, so twenty fit on the
   line; a chip says its name at once on hover. On the right, the star, See
   all and the dials. Where you are is the drawer's to say, so the line names
   the lab and round only while the drawer is hidden.

   Wherever there are versions, the one picked can be starred, with the star
   after the picks or with S, and the starred ones keep a star on their pick.
   The numbers and the arrows move between them in every lab (see `rounds.tsx`),
   G shows them all at once (see `see-all.tsx`), and `dials` is the row of
   toggles a round still has open, behind one button (see `dials.tsx`).
   The lab says which feature and part this is, so no lab passes anything. */

/** Stars already given their note on this visit, so one whose address cannot
    be written is not asked again on every frame. */
const healed = new Set<string>()

/** True inside a frame of Starred's side by side, where the round is drawn
    alone: the head draws nothing and takes no keys, but still makes sure the
    starred version is the one shown. */
export const FrameCtx = createContext(false)

export type LabPick = { id: string; name: string; locked?: boolean; hint?: string; title?: string }

export function LabHead({
  crumb,
  about,
  picks,
  picked,
  onPick,
  says,
  starred,
  shownAs,
  extra,
  dials,
  className,
}: {
  crumb: React.ReactNode
  about?: React.ReactNode
  picks?: LabPick[]
  picked?: string
  onPick?: (id: string) => void
  says?: string
  starred?: Set<string>
  /** How the part is shown, set beside its name so it stays put however
      many versions follow. */
  shownAs?: React.ReactNode
  extra?: React.ReactNode
  /** The toggles still open on this round, in a row of their own. */
  dials?: readonly Dial[]
  className?: string
}) {
  const here = useStarsHere()
  const frame = useContext(FrameCtx)
  /* In the Starred view the head shows the starred versions instead of the
     lab's own, and a pick's id is its star's key. */
  const view = here?.view
  const shown = view ? view.picks : picks
  const chosen = view ? view.picked : picked
  const choose = view ? view.onPick : onPick
  const key = here && shown && chosen ? (id: string) => (view ? id : starKey(here.feature, here.part, id)) : undefined
  const marked = view ? undefined : (starred ?? (key ? new Set(shown!.filter((p) => here!.stars.has(key(p.id))).map((p) => p.id)) : undefined))
  const on = !!key && here!.stars.has(key(chosen!))
  const name = shown?.find((p) => p.id === chosen)?.name ?? ""
  /* A star's round is drawn afresh for each star, so this asks once per star. */
  const forced = useRef(false)

  /* See all draws each option in a frame at its own address, so it is offered
     where the address can say which option is on: a round that holds its
     option to itself has nothing to draw in them. */
  const [block, setBlock] = useState<HTMLElement | null>(null)
  const [seeing, setSeeing] = useParam("see", "")
  const [seeable, setSeeable] = useState(false)
  useEffect(() => {
    if (frame || view || !here || !picks || picks.length < 2 || !picked) return setSeeable(false)
    const other = picks.find((p) => p.id !== picked) ?? picks[0]
    const t = setTimeout(() => setSeeable(addressFor(picked, other.id) !== addressFor(picked, picked)))
    return () => clearTimeout(t)
  })
  const see = seeable && !!seeing
  useOptionKeys(frame || view ? undefined : picks?.map((p) => p.id), picked, onPick)

  /* In Starred, the round drawn shows the starred version even when the
     address could not say so; out of it, a starred version whose star lacks
     its name or address, or carries an old name, is given them. */
  useEffect(() => {
    if (!here || !picks || !picked || (frame && !view)) return
    if (view) {
      if (!forced.current && picked !== view.version && picks.some((p) => p.id === view.version)) {
        forced.current = true
        onPick?.(view.version)
      }
      return
    }
    /* After the round has written its own values to the address. */
    const t = setTimeout(() => {
      for (const p of picks) {
        const star = here.list.find((s) => s.key === starKey(here.feature, here.part, p.id))
        if (!star || healed.has(star.key)) continue
        const at = star.at || addressFor(picked, p.id)
        if (star.name === p.name && star.at === at) continue
        healed.add(star.key)
        here.note(star.key, p.name, at)
      }
    })
    return () => clearTimeout(t)
  })

  useEffect(() => {
    if (!key || frame) return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (typing(e)) return
      if (e.key === "s") return here!.toggle(key!(chosen!), name)
      if (e.key === "g" && seeable) {
        e.stopImmediatePropagation()
        return setSeeing(see ? "" : "1")
      }
      /* See all takes the keys first, since the round is behind it. */
      if (see) {
        const list = picks!
        const at = list.findIndex((p) => p.id === picked)
        const arrow = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
        const onButton = (e.target as HTMLElement).closest("button")
        if (e.key === "Escape" || (e.key === "Enter" && !onButton)) setSeeing("")
        else if (arrow) onPick?.(list[(at + arrow + list.length) % list.length].id)
        else if (/^[1-9]$/.test(e.key) && list[Number(e.key) - 1]) {
          onPick?.(list[Number(e.key) - 1].id)
          setSeeing("")
        } else return
        return e.stopImmediatePropagation()
      }
      /* The lab's own keys step through its own versions, so in Starred the
         head takes them first and steps through the starred ones. */
      if (!view) return
      const list = view.picks
      const at = list.findIndex((p) => p.id === view.picked)
      const n = Number(e.key)
      const to = n >= 1 && n <= list.length ? n - 1 : e.key === "ArrowRight" ? (at + 1) % list.length : e.key === "ArrowLeft" ? (at - 1 + list.length) % list.length : -1
      if (/^[0-9]$/.test(e.key) || e.key === "ArrowRight" || e.key === "ArrowLeft") e.stopImmediatePropagation()
      if (to >= 0) view.onPick(list[to].id)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  })

  if (frame) return null

  /* A frame of See all: this part, at the option's own address. */
  const frameOf = (id: string) => {
    const q = new URLSearchParams(addressFor(picked!, id))
    q.set("lab", here!.feature)
    q.set("part", here!.part)
    q.set("frame", "1")
    return `${window.location.pathname}?${q}`
  }

  return (
    <>
    <header ref={setBlock} className={cn("flex shrink-0 px-6 py-3", className)}>
      {/* One row: the link and the info mark, the versions, then the star,
          See all and the dials on the right. */}
      <div className="flex min-h-8 w-full items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          {crumb}
          {(about || says) && <About asks={about} name={name} says={says} />}
          {shownAs && <div className="ml-2 flex items-center">{shownAs}</div>}
        </div>
        {shown && shown.length > 0 && (
          <div role="tablist" aria-label={view ? "Starred versions" : "Versions"} className="flex min-w-0 flex-wrap items-center">
            {shown.map((p, i) => {
              const on = p.id === chosen
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={p.name}
                  onClick={() => {
                    choose?.(p.id)
                    if (see) setSeeing("")
                  }}
                  className={cn(
                    "group/chip relative flex h-6 min-w-5 cursor-pointer items-center justify-center gap-1 rounded-md text-xs leading-none whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
                    on ? "mx-1 bg-(--lab-ink) px-2.5 text-(--lab-paper)" : "px-1 text-(--lab-muted) hover:bg-black/[0.05] hover:text-(--lab-ink)",
                  )}
                >
                  {on ? <span className="max-w-[260px] truncate">{p.name}</span> : chipOf(p, i)}
                  {p.hint && <span className={cn("text-[11px]", on ? "opacity-60" : "text-(--lab-quiet)")}>{p.hint}</span>}
                  {marked?.has(p.id) && <Star aria-label="Starred" className="size-2.5 fill-(--lab-star) text-(--lab-star)" />}
                  {p.locked && <Lock aria-label="Locked" className="size-3" />}
                  {/* The name, at once on hover, for a version that shows only its letter. */}
                  {!on && (
                    <span
                      role="tooltip"
                      className="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 rounded-md border border-(--lab-line) bg-(--lab-paper) px-2 py-1 text-xs text-(--lab-ink) opacity-0 shadow-md group-hover/chip:visible group-hover/chip:opacity-100 group-focus-visible/chip:visible group-focus-visible/chip:opacity-100"
                    >
                      {p.locked ? `${p.name} · Locked` : p.name}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {extra && <div className="mr-1 flex items-center gap-2">{extra}</div>}
          {key && (
            <button
              type="button"
              onClick={() => here!.toggle(key(chosen!), name)}
              aria-pressed={on}
              aria-label={on ? "Unstar this version" : "Star this version"}
              title={on ? "Unstar  S" : "Star  S"}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
            >
              <Star key={String(on)} className={cn("size-3.5", on ? "lab-star fill-(--lab-star) text-(--lab-star)" : "text-(--lab-quiet)")} />
            </button>
          )}
          {seeable && (
            <button
              type="button"
              onClick={() => setSeeing(see ? "" : "1")}
              aria-pressed={see}
              aria-label="See all"
              title={see ? "Back to one  G" : "See all  G"}
              className={cn(
                "flex size-7 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
                see ? "bg-(--lab-ink) text-(--lab-paper)" : "text-(--lab-quiet) hover:bg-black/[0.05] hover:text-(--lab-ink)",
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          )}
          {dials && dials.length > 0 && <DialsMenu dials={dials} />}
        </div>
      </div>
    </header>
    {see && key && (
      <SeeAll
        head={block}
        picks={picks!}
        picked={picked}
        src={frameOf}
        onOpen={(id) => {
          onPick?.(id)
          setSeeing("")
        }}
        starred={(id) => here!.stars.has(key(id))}
        onStar={(p) => {
          const star = key(p.id)
          const was = here!.stars.has(star)
          here!.toggle(star, p.name)
          if (!was) here!.note(star, p.name, addressFor(picked!, p.id))
        }}
      />
    )}
    </>
  )
}

/** A version's chip: the letter its name opens with ("A · Flat" is A), or
    its number when the name has none. */
function chipOf(p: LabPick, i: number) {
  return p.name.match(/^(\S{1,3}) · /)?.[1] ?? String(i + 1)
}

/** What the part asks, and what the picked version does, behind one mark. */
function About({ asks, name, says }: { asks?: React.ReactNode; name?: string; says?: string }) {
  return (
    <span className="group/about relative flex">
      <button
        type="button"
        aria-label="What this part asks, and what the picked version does"
        className="flex size-6 cursor-default items-center justify-center rounded-md text-(--lab-quiet) outline-none hover:text-(--lab-ink) focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
      >
        <Info className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute top-full left-0 z-30 mt-1 w-[380px] rounded-lg border border-(--lab-line) bg-(--lab-paper) p-3 text-[13px] leading-[18px] text-(--lab-ink) opacity-0 shadow-md transition-opacity duration-150 group-focus-within/about:visible group-focus-within/about:opacity-100 group-hover/about:visible group-hover/about:opacity-100"
      >
        {asks}
        {says && (
          <span className={cn("block", asks && "mt-2 border-t border-(--lab-line) pt-2")}>
            {name && <span className="font-medium">{name}. </span>}
            <span className="text-(--lab-muted)">{says}</span>
          </span>
        )}
      </span>
    </span>
  )
}
