import { useEffect, useSyncExternalStore } from "react"

import { local, root } from "./config"

/* The lab's address says where you are and nothing else:
   `<base>lab/<lab>/<part>`, with the lab's opening part left off.

   What is picked on the page — a version, a palette, a view — is held here
   for this tab instead, so the address stays readable and a reload still
   comes back to what was picked. The link mark beside the page's name copies
   the place with the picks of the page on screen on it (see `link.tsx`), and
   nothing a lab looked at earlier rides along.

   A link like that, or an old one that carried the lab, the part and every
   pick in its query, is read once as the lab opens and then tidied back to
   the place. A frame of Starred's side by side keeps its address as it came:
   it is a page nobody reads the address of, and it holds no picks of its
   own. */

/** What the address keeps in its query: how the page is drawn, not what is picked. */
const KEPT = new Set(["frame"])
/** What an old address said that the path now says. */
const DROPPED = new Set(["v"])
const SESSION = () => local("lab-picks")
const IN_FRAME = new URLSearchParams(window.location.search).has("frame")

/** Whether the address is a lab place: the lab once opened at `?v=lab`. */
export const atLab = () => window.location.pathname === root() || window.location.pathname.startsWith(root() + "/")

let picks: Map<string, string> | undefined
/** The keys the lab has taken off the address: what it read in as it opened
    and every key a page of it reads. Any other key is some other code's, and
    stays where that code put it. */
const owned = new Set<string>(["lab", "part", ...DROPPED])
const heard = new Set<() => void>()
/** The keys the page on screen reads, with their defaults. */
const shown = new Map<string, { fallback: string; n: number }>()

function saved(): Record<string, string> {
  try {
    const held = JSON.parse(sessionStorage.getItem(SESSION()) ?? "{}")
    return held && typeof held === "object" ? held : {}
  } catch {
    return {}
  }
}

function save() {
  if (IN_FRAME || !picks) return
  const held: Record<string, string> = {}
  picks.forEach((v, k) => {
    if (k !== "lab" && k !== "part") held[k] = v
  })
  try {
    sessionStorage.setItem(SESSION(), JSON.stringify(held))
  } catch {
    /* Held for this page only. */
  }
}

/** The picks, read once from the tab and the address. The address wins: it
    is the link somebody followed. */
function start(): Map<string, string> {
  if (picks) return picks
  picks = new Map(IN_FRAME ? [] : Object.entries(saved()))
  const url = new URL(window.location.href)
  const ROOT = root()
  const rest = url.pathname === ROOT || url.pathname.startsWith(ROOT + "/") ? url.pathname.slice(ROOT.length) : ""
  const [lab, part] = rest.split("/").filter(Boolean).map(decodeURIComponent)
  if (lab) picks.set("lab", lab)
  if (part) picks.set("part", part)
  url.searchParams.forEach((v, k) => {
    if (KEPT.has(k)) return
    owned.add(k)
    if (v && !DROPPED.has(k)) picks!.set(k, v)
  })
  save()
  return picks
}

/** The place as a path, each step left off while it is the default. A link
    says every step: the opening part moves on with each new round. */
function place(whole = false): string {
  const p = start()
  const lab = p.get("lab") ?? (whole ? (shown.get("lab")?.fallback ?? "") : "")
  const part = p.get("part") ?? (whole ? (shown.get("part")?.fallback ?? "") : "")
  const partOut = part && (whole || part !== shown.get("part")?.fallback) ? part : ""
  const labOut = lab && (partOut || lab !== shown.get("lab")?.fallback) ? lab : ""
  return [root(), labOut, partOut].filter(Boolean).map((s, i) => (i ? encodeURIComponent(s) : s)).join("/") + (labOut ? "" : "/")
}

function write() {
  if (IN_FRAME) return
  const url = new URL(window.location.href)
  const kept = new URLSearchParams()
  url.searchParams.forEach((v, k) => {
    if (!owned.has(k)) kept.set(k, v)
  })
  const next = place() + (kept.size ? `?${kept}` : "") + url.hash
  if (next !== url.pathname + url.search + url.hash) window.history.replaceState(null, "", next)
}

function tell() {
  heard.forEach((f) => f())
}

function hear(f: () => void) {
  heard.add(f)
  return () => {
    heard.delete(f)
  }
}

/** Sets a pick. An empty value is no value, so the key's default shows. */
export function setPick(key: string, value: string) {
  const p = start()
  if (value) p.set(key, value)
  else p.delete(key)
  save()
  write()
  tell()
}

/** A pick as it stands, for code outside a component. */
export const pickOf = (key: string): string | undefined => start().get(key)

/** The picks of the page on screen, with or without the ones at their
    default, and never the place. */
export function picksHere(all = false): URLSearchParams {
  const p = start()
  const q = new URLSearchParams()
  shown.forEach(({ fallback }, k) => {
    if (k === "lab" || k === "part") return
    const v = p.get(k) ?? fallback
    if (v && (all || v !== fallback)) q.set(k, v)
  })
  return q
}

/** The place with the picks of the page on screen: what the link mark copies. */
export function linkHere(): string {
  const q = picksHere()
  return window.location.origin + place(true) + (q.size ? `?${q}` : "")
}

/** Puts back picks held as a query, as a star keeps them, without a word to
    the page while it is drawing: it reads them as it draws. */
export function putPicks(at: string, skip: Set<string>) {
  const p = start()
  new URLSearchParams(at).forEach((v, k) => {
    if (!skip.has(k)) p.set(k, v)
  })
  save()
  queueMicrotask(() => {
    write()
    tell()
  })
}

/** A value the lab keeps — the place in the address, a pick in the tab — so
    a reload, and a copied link, land on what was being looked at. */
export function useParam(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(hear, () => start().get(key) ?? fallback)
  useEffect(() => {
    const was = shown.get(key)
    shown.set(key, { fallback, n: (was?.n ?? 0) + 1 })
    owned.add(key)
    write()
    return () => {
      const now = shown.get(key)
      if (now && now.n > 1) shown.set(key, { ...now, n: now.n - 1 })
      else shown.delete(key)
    }
  }, [key, fallback])
  return [value, (v: string) => setPick(key, v)]
}
