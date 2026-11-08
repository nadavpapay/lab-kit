import { createContext, useContext, useEffect, useRef, useState } from "react"

import type { LabPick } from "./head"
import { keys, local } from "./config"
import { picksHere, putPicks } from "./param"
import { readShared, writeShared } from "./shared"

/* The versions somebody starred in the lab: marked on their pick,
   counted in the drawer beside their part, and gathered in each feature's
   Starred view.

   With a lab server (see `serve.py`) a star is kept there beside the rail's
   statuses, keyed `star-<id>-<feature>/<part>--<version>`, so it is the same
   on every device and never mixes with another lab's. It carries a
   short note: the version's name and the address it was starred at, so
   Starred can name it and open it as it was seen without knowing how each lab
   draws its versions. A star belongs to the part it was given in, since the
   same version can mean something else in another round. The last copy is
   also held in the browser, so the stars are there from the first frame. */

const CACHE = () => local("lab-stars")

/** What the address carries that belongs to the lab rather than the version. */
const OWN = new Set(["v", "lab", "part", "star", "frame", "see"])

export type Starred = { key: string; feature: string; part: string; version: string; name: string; at: string }

/** One star's key, without the server's prefix: `<feature>/<part>--<version>`. */
export const starKey = (feature: string, part: string, version: string) => `${feature}/${part}--${version}`

/** A star read back from its key and note. A note that cannot be read still
    leaves the star, named from its id. */
function read(key: string, note: unknown): Starred | null {
  const m = key.match(/^([a-z0-9-]+)\/(.+?)--(.+)$/)
  if (!m) return null
  let name = m[3].replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
  let at = ""
  try {
    const held = JSON.parse(String(note))
    if (typeof held?.name === "string") name = held.name
    if (typeof held?.at === "string") at = held.at
  } catch {
    /* An old star, or a word: the name stays the id's. */
  }
  return { key, feature: m[1], part: m[2], version: m[3], name, at }
}

/** The address now, less what belongs to the lab, kept short enough to note. */
function here(): string {
  const q = picksHere(true)
  OWN.forEach((k) => q.delete(k))
  const at = q.toString()
  return at.length <= 300 ? at : ""
}

function cached(): Starred[] {
  try {
    const held = JSON.parse(localStorage.getItem(CACHE()) ?? "[]")
    return Array.isArray(held) ? held : []
  } catch {
    return []
  }
}

function keep(next: Starred[]) {
  try {
    localStorage.setItem(CACHE(), JSON.stringify(next))
  } catch {
    /* Held for this visit only. */
  }
}

export function useStars(): [Starred[], (key: string, name: string) => void, (key: string, name: string, at: string) => void] {
  const [list, setList] = useState(cached)
  /* The latest list, so two quick presses each see what the one before did. */
  const held = useRef(list)
  held.current = list

  useEffect(() => {
    let live = true
    const PREFIX = keys.starPrefix()
    readShared()
      .then((held) => {
        if (!live || !held) return
        const next = Object.keys(held)
          .filter((k) => k.startsWith(PREFIX))
          .map((k) => read(k.slice(PREFIX.length), held[k]))
          .filter((s): s is Starred => !!s)
        setList(next)
        keep(next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  function toggle(key: string, name: string) {
    const was = held.current
    const on = !was.some((s) => s.key === key)
    const at = here()
    const star = on ? read(key, JSON.stringify({ name, at })) : null
    const next = star ? [...was, star] : was.filter((s) => s.key !== key)
    held.current = next
    setList(next)
    keep(next)
    writeShared(keys.starPrefix() + key, on ? JSON.stringify({ name, at }) : null)
  }

  /* Gives a star the name and address it lacks, or the name its version has
     since taken, without starring or unstarring it. Stars given before they
     carried notes are healed this way when their round is opened. */
  function note(key: string, name: string, at: string) {
    const star = read(key, JSON.stringify({ name, at }))
    if (!star || !held.current.some((s) => s.key === key)) return
    const next = held.current.map((s) => (s.key === key ? star : s))
    held.current = next
    setList(next)
    keep(next)
    writeShared(keys.starPrefix() + key, JSON.stringify({ name, at }))
  }

  return [list, toggle, note]
}

/** The address now with the version a star names in place of the one shown,
    found as whichever value of the address is the version picked. */
export function addressFor(picked: string, version: string): string {
  const q = new URLSearchParams(here())
  q.forEach((v, k) => {
    if (v === picked) q.set(k, version)
  })
  return q.toString()
}

/** Puts a star's address back, so the lab it opens reads the version (and
    whatever else was set beside it) as it was starred. */
export function restore(star: Starred) {
  putPicks(star.at, OWN)
}

/** Where the head is, so any lab's head can star its picked version without
    the lab passing anything. In the Starred view `view` replaces the lab's
    own picks with the starred ones. */
export const StarsCtx = createContext<{
  feature: string
  part: string
  stars: Set<string>
  list: Starred[]
  toggle: (key: string, name: string) => void
  note: (key: string, name: string, at: string) => void
  view?: { picks: LabPick[]; picked: string; version: string; onPick: (key: string) => void }
} | null>(null)

export const useStarsHere = () => useContext(StarsCtx)
