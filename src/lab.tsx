import { Fragment, useEffect, useRef, useState } from "react"
import { PanelLeftClose, PanelLeftOpen, Star } from "lucide-react"

import { config, keys, local } from "./config"
import type { Feature, Part } from "./feature"
import type { LucideIcon } from "lucide-react"
import { FrameCtx, LabHead, type LabPick } from "./head"
import { CopyLink } from "./link"
import { putPicks, useParam } from "./param"
import { RailItem } from "./rail-item"
import { RailRuns, useRailOrder } from "./rail-order"
import { arrange, ArchiveRow, newest, useArchive, useLastPlace, useOwnArrows, useRowKeys } from "./rounds"
import { useSize } from "./stage"
import { restore, StarsCtx, useStars, type Starred } from "./stars"
import { useLabStatus } from "./status"
import { cn } from "./cn"

/* The lab: a rail of
   the features being worked on, a drawer of the parts of the one picked, and
   the versions of a part in the page's head, each one starrable. The address
   carries the feature, the part and the version, so a link lands on what was
   looked at.

   A feature is a file in the project's `src/features/` (see `feature.ts`);
   the lab draws everything else from it. */

/* Starred sits above the rounds and gathers the versions starred in any of
   them, in the order the rounds run, each marked with the round it came from.
   Picking one opens it as its own round draws it, at the address it was
   starred at. */
const STARRED = "starred"

const STARRED_ASKS = "The versions starred in every round, side by side. Star one with S, or the star after the versions."

/* Side by side draws every starred version at once. Each round reads its
   version from the address, so each is drawn in a frame of its own, at
   FRAME's size and shrunk to its cell; the frame is the lab with `frame` set,
   which draws only the round, without the rail, the drawer or the head. */
const STARRED_SIDE = "starred-side"

const STARRED_SIDE_ASKS = "Every starred version at once, each as its round draws it, so they can be held against each other. A click opens one."

const FRAME = { w: 1280, h: 800 }

/** The narrowest a frame is drawn, so the columns give way before it is unreadable. */
const FRAME_MIN = 420

/** Whether this lab is a frame of Side by side. Read once: it never changes. */
const IN_FRAME = new URLSearchParams(window.location.search).has("frame")

/** A star's round, short enough for its pick: R2 for anything under Round 2,
    or for a part named Round 2 under some other heading. */
const roundOf = (p: Part) => ((p.sub ?? p.group)?.match(/^Round (\d+)/) ?? p.name.match(/^Round (\d+)/))?.[1]

const STORE = () => local("lab-drawer-open")
const ARCHIVE = () => local("lab-archive")
const LAST = () => local("lab-last")
const SHELF_LAST = () => local("lab-shelf-last")

/** A tile on the rail: one lab, or every lab on one shelf. */
type Tile = { id: string; short: string; Icon: LucideIcon; features: Feature[] }

function tilesOf(features: Feature[]): Tile[] {
  const tiles: Tile[] = []
  for (const f of features) {
    const id = f.shelf?.id ?? f.id
    const t = tiles.find((x) => x.id === id)
    if (t) t.features.push(f)
    else tiles.push({ id, short: f.shelf?.short ?? f.short, Icon: f.shelf?.Icon ?? f.Icon, features: [f] })
  }
  return tiles
}

/** Which lab of each shelf was open last, so its tile reopens on it. */
function shelfLast(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SHELF_LAST()) ?? "{}")
  } catch {
    return {}
  }
}

function readOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORE()) ?? "{}")
  } catch {
    return {}
  }
}

export function Lab({ features: FEATURES }: { features: Feature[] }) {
  const TILES = tilesOf(FEATURES)
  const PARTS = Object.fromEntries(TILES.map((t) => [keys.status(t.id), t.features.reduce((n, f) => n + f.parts.filter((p) => !p.next).length, 0)]))

  // The lab's own tab icon, when it has one.
  useEffect(() => {
    const icon = config().icon
    if (!icon) return
    const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')]
    const was = links.map((l) => l.href)
    for (const l of links) l.href = icon
    return () => links.forEach((l, i) => (l.href = was[i]))
  }, [])
  const [featureId, setFeatureId] = useParam("lab", FEATURES[0].id)
  const feature = FEATURES.find((f) => f.id === featureId) ?? FEATURES[0]
  const top = newest(feature.parts)
  const [partId, setPartId] = useParam("part", top.id)
  const part = feature.parts.find((p) => p.id === partId && !p.next) ?? top

  /* A lab or part this lab no longer has — from an old link — comes off the
     address rather than naming a page that is not the one shown, unless the
     part was folded into another, which opens on what it showed. */
  const known = feature.id === featureId && (partId === STARRED || partId === STARRED_SIDE || feature.parts.some((p) => p.id === partId))
  const moved = feature.id === featureId ? feature.moved?.[partId] : undefined
  useEffect(() => {
    if (known) return
    if (moved) return putPicks(moved, new Set())
    if (feature.id !== featureId) setFeatureId("")
    setPartId("")
  })

  const [status, setStatus] = useLabStatus(PARTS)
  const rail = useRailOrder(TILES.map((t) => t.id))
  const tile = TILES.find((t) => t.features.includes(feature))!
  const shelf = feature.shelf
  /* Opens a lab where it was left, or on its newest round. */
  const openLab = (f: Feature) => {
    setFeatureId(f.id)
    setPartId(place.recall(f.id, f.parts))
  }
  const [stars, toggleStar, noteStar] = useStars()
  const starKeys = new Set(stars.map((s) => s.key))

  /* The Starred view: this feature's stars in the order its parts run, the
     one picked, and the part that draws it. */
  const starring = partId === STARRED && !feature.starless
  const starSide = partId === STARRED_SIDE && !feature.starless
  const [starId, setStarId] = useParam("star", "")
  const order = (s: Starred) => feature.parts.findIndex((p) => p.id === s.part && !p.next)
  const mine = stars.filter((s) => s.feature === feature.id && order(s) >= 0).sort((a, b) => order(a) - order(b))
  const shown = starring ? (mine.find((s) => s.key === starId) ?? mine[0]) : undefined
  const body = shown ? feature.parts[order(shown)] : part
  const starPicks: LabPick[] = mine.map((s) => {
    const p = feature.parts[order(s)]
    const r = roundOf(p)
    return { id: s.key, name: s.name, hint: r ? `R${r}` : undefined, title: [p.sub ?? p.group, p.name].filter(Boolean).join(" · ") }
  })

  /* The address a star was given at goes back before its round is drawn, so
     the round reads its version from it as it mounts. */
  const restored = useRef<string>(undefined)
  if (shown && restored.current !== shown.key) {
    restore(shown)
    restored.current = shown.key
  }
  if (!shown) restored.current = undefined

  const [open, setOpen] = useState(readOpen)
  const drawer = open[feature.id] ?? true
  function toggle() {
    setOpen((o) => {
      const next = { ...o, [feature.id]: !drawer }
      try {
        localStorage.setItem(STORE(), JSON.stringify(next))
      } catch {
        /* Held for this visit only. */
      }
      return next
    })
  }

  /* The drawer's two runs, and the way up and down them. */
  const { live, archive } = arrange(feature.parts)
  const holding = !starring && !starSide && archive.some((p) => p.id === part.id)
  const [archiveOpen, toggleArchive] = useArchive(ARCHIVE(), feature.id, holding)
  useRowKeys([...live, ...archive].filter((p) => !p.next).map((p) => p.id), starring || starSide ? "" : part.id, setPartId)
  useOwnArrows(!!feature.ownArrows)

  /* Where this lab was left, so going back finds it. */
  const place = useLastPlace(LAST())
  useEffect(() => {
    if (!IN_FRAME && feature.id === featureId && feature.parts.some((p) => p.id === partId)) place.keep(feature.id, part.id, top.id)
    if (!IN_FRAME && shelf && shelfLast()[shelf.id] !== feature.id) {
      try {
        localStorage.setItem(SHELF_LAST(), JSON.stringify({ ...shelfLast(), [shelf.id]: feature.id }))
      } catch {
        /* Held for this visit only. */
      }
    }
  })

  useEffect(() => {
    document.title = `${config().name} · ${feature.name}`
  }, [feature.name])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const crumb = (
    <div className="flex h-8 items-center gap-1 text-[13px] leading-[18px]">
      {!drawer && (
        <button
          type="button"
          onClick={toggle}
          title="Show the parts  ⌘\"
          aria-label="Show the parts"
          className="-ml-1.5 flex size-7 cursor-pointer items-center justify-center rounded-md text-(--lab-quiet) outline-none hover:bg-black/[0.05] hover:text-(--lab-ink) focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}
      {/* The drawer names where you are; with it hidden, the head does. */}
      {!drawer && (
        <>
          <span className="text-(--lab-quiet)">{feature.name}</span>
          <span aria-hidden className="text-(--lab-quiet)">/</span>
          {(starSide || (!starring && part.group)) && (
            <>
              <span className="text-(--lab-quiet)">{starSide ? "Starred" : (part.sub ?? part.group)}</span>
              <span aria-hidden className="text-(--lab-quiet)">/</span>
            </>
          )}
          <span className="font-medium">{starring ? "Starred" : starSide ? "Side by side" : part.name}</span>
        </>
      )}
      <CopyLink />
    </div>
  )

  const content = (
    <StarsCtx.Provider
      value={{
        feature: feature.id,
        part: body.id,
        stars: starKeys,
        list: stars,
        toggle: toggleStar,
        note: noteStar,
        view: shown && !starSide ? { picks: starPicks, picked: shown.key, version: shown.version, onPick: setStarId } : undefined,
      }}
    >
      <div key={starSide ? STARRED_SIDE : (shown?.key ?? `${feature.id}/${body.id}`)} data-lab-room className="relative flex min-w-0 flex-1 flex-col">
        {(starring && !shown) || (starSide && !mine.length) ? (
          <NoneStarred crumb={crumb} />
        ) : starSide ? (
          <StarredSide
            crumb={crumb}
            feature={feature}
            stars={mine}
            picks={starPicks}
            onOpen={(key) => {
              setStarId(key)
              setPartId(STARRED)
            }}
          />
        ) : (
          <body.Draw crumb={crumb} about={body.asks} open={setPartId} />
        )}
      </div>
    </StarsCtx.Provider>
  )

  /* The open lab's rows: Starred, Side by side, then its rounds. */
  const parts = (
    <>
            {!feature.starless && (
              <button
                type="button"
                onClick={() => setPartId(STARRED)}
                aria-current={starring || undefined}
                className={cn(
                  "flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-left text-[13px] leading-[18px] outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
                  starring ? "bg-(--lab-paper) font-medium shadow-xs" : "cursor-pointer hover:bg-black/[0.04]",
                )}
              >
                Starred
                {mine.length > 0 && <span className="text-[11px] leading-[14px] font-normal text-(--lab-quiet) tabular-nums">{mine.length}</span>}
              </button>
            )}
            {!feature.starless && (
              <button
                type="button"
                onClick={() => setPartId(STARRED_SIDE)}
                aria-current={starSide || undefined}
                className={cn(
                  "flex h-8 shrink-0 items-center rounded-md px-2 text-left text-[13px] leading-[18px] outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
                  starSide ? "bg-(--lab-paper) font-medium shadow-xs" : "cursor-pointer hover:bg-black/[0.04]",
                )}
              >
                Side by side
              </button>
            )}
            {/* Stars above, rounds below. */}
            {!feature.starless && live.length > 0 && <div aria-hidden className="mx-2 my-1.5 shrink-0 border-t border-(--lab-line)" />}
            {[...live, ...(archiveOpen ? archive : [])].map((p, i, list) => {
              const on = !starring && !starSide && p.id === part.id
              const starred = mine.filter((s) => s.part === p.id).length
              const old = i >= live.length
              /* In Archive a row's round or topic is its label; the fold says the rest. */
              const label = old ? (p.sub ?? (p.group === "Earlier" ? undefined : p.group)) : p.group
              const said = list[i - 1] && (i - 1 >= live.length ? (list[i - 1].sub ?? (list[i - 1].group === "Earlier" ? undefined : list[i - 1].group)) : list[i - 1].group)
              const head = label && (i === live.length || label !== said)
              return (
                <Fragment key={p.id}>
                  {i === live.length && <ArchiveRow parts={archive} open={archiveOpen} holding={holding} onToggle={toggleArchive} />}
                  {head && <p className={cn("m-0 px-2 text-[11px] leading-[14px] text-(--lab-quiet)", old ? "pt-3 pb-1 pl-6" : cn("pb-3", i > 0 ? "pt-5" : !feature.starless && "pt-2"))}>{label}</p>}
                  <button
                    type="button"
                    disabled={p.next}
                    onClick={() => setPartId(p.id)}
                    aria-current={on || undefined}
                    className={cn(
                      "flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-left text-[13px] leading-[18px] outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
                      old && "pl-6",
                      on ? "bg-(--lab-paper) font-medium shadow-xs" : p.next ? "cursor-default text-(--lab-quiet)" : "cursor-pointer hover:bg-black/[0.04]",
                    )}
                  >
                    <span className="min-w-0 truncate">{p.name}</span>
                    {p.next && <span className="text-[11px]">Next</span>}
                    {!p.next && starred > 0 && (
                      <span title={`${starred} starred`} className="flex items-center gap-0.5 text-[11px] leading-[14px] font-normal text-(--lab-quiet)">
                        <Star aria-hidden className="size-3 fill-(--lab-star) text-(--lab-star)" />
                        {starred}
                      </span>
                    )}
                  </button>
                </Fragment>
              )
            })}
            {!archiveOpen && archive.length > 0 && <ArchiveRow parts={archive} open={false} holding={false} onToggle={toggleArchive} />}
    </>
  )

  /* A frame of Side by side: the round alone, filling the frame. */
  if (IN_FRAME)
    return (
      <>
        <FrameCtx.Provider value={true}>
          <div className="flex h-dvh w-full overflow-hidden bg-(--lab-chrome) pt-6 font-sans text-(--lab-ink)">
            {content}
          </div>
        </FrameCtx.Provider>
      </>
    )

  return (
    <>
      <div
        className="flex h-dvh w-full overflow-hidden bg-(--lab-chrome) font-sans text-(--lab-ink)"
      >
        {/* More labs than the screen is tall: the rail scrolls on its own, its bar hidden so it keeps its width. */}
        <nav aria-label="Labs" className="flex min-h-0 w-20 shrink-0 flex-col items-center gap-3 overflow-y-auto overscroll-contain border-r border-(--lab-line) bg-(--lab-rail) py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <RailRuns rail="rail" items={rail.sort(TILES)} picked={tile.id} stage={(id) => status[keys.status(id)]} onMove={rail.move}>
            {(t, lifted) => (
              <RailItem
                name={t.short}
                Icon={t.Icon}
                on={t.id === tile.id}
                lifted={lifted}
                status={status[keys.status(t.id)]}
                onOpen={() => {
                  if (t.id === tile.id && t.features.length > 1) return
                  openLab(t.features.find((f) => f.id === shelfLast()[t.id]) ?? t.features[0])
                }}
                onStatus={(next) => setStatus(keys.status(t.id), next)}
              />
            )}
          </RailRuns>
        </nav>

        <div className={cn("shrink-0 overflow-hidden transition-[width] duration-200 ease-out", drawer ? "w-56 border-r border-(--lab-line)" : "w-0")} inert={!drawer}>
          <nav aria-label="Parts" className="flex h-full w-56 flex-col gap-1 overflow-y-auto px-4 py-4">
            <div className="mb-3 flex h-8 items-center justify-between pl-2">
              <span className="min-w-0 truncate text-[13px] leading-[18px] font-medium">{shelf?.name ?? feature.name}</span>
              <button
                type="button"
                onClick={toggle}
                title="Hide the parts  ⌘\"
                aria-label="Hide the parts"
                className="-mr-1 flex size-7 cursor-pointer items-center justify-center rounded-md text-(--lab-quiet) outline-none hover:bg-black/[0.05] hover:text-(--lab-ink) focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
            {shelf
              ? tile.features.map((f, i) => (
                  <Fragment key={f.id}>
                    <button
                      type="button"
                      onClick={() => f.id !== feature.id && openLab(f)}
                      aria-expanded={f.id === feature.id}
                      className={cn(
                        "flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left text-[13px] leading-[18px] outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
                        f.id === feature.id ? "cursor-default font-medium" : "cursor-pointer text-(--lab-muted) hover:bg-black/[0.04] hover:text-(--lab-ink)",
                      )}
                    >
                      <span className="w-4 shrink-0 text-right text-[11px] leading-[14px] font-normal text-(--lab-quiet) tabular-nums">{i + 1}</span>
                      <span className="min-w-0 truncate">{f.name}</span>
                    </button>
                    {f.id === feature.id && <div className="mb-2 ml-[19px] flex flex-col gap-1 border-l border-(--lab-line) pl-2">{parts}</div>}
                  </Fragment>
                ))
              : parts}
          </nav>
        </div>

        {content}
      </div>
    </>
  )
}

/** Every starred version at once, in the order the rounds run. Each is its
    round drawn whole in a frame, shrunk to the cell, and a click opens it in
    Starred. */
function StarredSide({ crumb, feature, stars, picks, onOpen }: { crumb: React.ReactNode; feature: Feature; stars: Starred[]; picks: LabPick[]; onOpen: (key: string) => void }) {
  const room = useRef<HTMLDivElement>(null)
  const { width } = useSize(room)
  const gap = 24
  const cols = Math.max(1, Math.min(stars.length, Math.floor((width + gap) / (FRAME_MIN + gap))))
  const cell = Math.max(0, (width - gap * (cols - 1)) / cols)
  const scale = cell / FRAME.w

  /* The frame's address: this lab, opened on the star in Starred, with the
     address it was starred at. */
  const src = (s: Starred) => {
    const q = new URLSearchParams(s.at)
    q.set("lab", feature.id)
    q.set("part", STARRED)
    q.set("star", s.key)
    q.set("frame", "1")
    return `${window.location.pathname}?${q}`
  }

  return (
    <>
      <LabHead className="px-6 pt-4 pb-3" crumb={crumb} about={STARRED_SIDE_ASKS} />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div ref={room} className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}>
          {cell > 0 &&
            stars.map((s, i) => (
              <button key={s.key} type="button" onClick={() => onOpen(s.key)} title={picks[i]?.title} className="group flex min-w-0 cursor-pointer flex-col gap-2.5 text-left outline-none">
                <span className="flex min-w-0 items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-(--lab-quiet)">{i + 1}</span>
                  <span className="truncate font-medium">{s.name}</span>
                  {picks[i]?.hint && <span className="text-[11px] text-(--lab-quiet)">{picks[i].hint}</span>}
                </span>
                <span
                  className="relative block overflow-hidden rounded-lg bg-(--lab-chrome) shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.08)] transition-[translate,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_14px_32px_rgb(0_0_0/0.14)] group-focus-visible:ring-2 group-focus-visible:ring-(--lab-ring)"
                  style={{ height: FRAME.h * scale }}
                >
                  <iframe
                    src={src(s)}
                    title={s.name}
                    loading="lazy"
                    tabIndex={-1}
                    aria-hidden
                    className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
                    style={{ width: FRAME.w, height: FRAME.h, transform: `scale(${scale})` }}
                  />
                </span>
              </button>
            ))}
        </div>
      </div>
    </>
  )
}

/** Starred before anything is: where the stars will gather. */
function NoneStarred({ crumb }: { crumb: React.ReactNode }) {
  return (
    <>
      <LabHead className="px-6 pt-4 pb-3" crumb={crumb} about={STARRED_ASKS} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 pb-16 text-center">
        <Star className="size-5 text-(--lab-quiet)" />
        <p className="m-0 text-[13px] leading-[18px] font-medium">Nothing starred yet</p>
        <p className="m-0 max-w-[280px] text-xs leading-4 text-(--lab-muted)">Star a version in any round and it gathers here, beside the others.</p>
      </div>
    </>
  )
}
