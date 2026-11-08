import { useEffect, useState } from "react"

import { local } from "./config"
import { hasServer, readShared, writeShared } from "./shared"

/* Where each lab's subject stands, set from its tile on the rail.

   A lab has no status until somebody gives it one, so colour on the rail
   always means somebody said so. With a lab server (see `serve.py`) it is
   kept there, keyed `<id>-rail/<lab>`, and everyone with the link sees the
   same rail. The last copy is also held in the browser, so the rail is tinted
   from the first frame rather than a moment after; without a server that
   copy is the only one. */

export type Status = "todo" | "doing" | "review" | "done"

export const STATUSES: { id: Status; label: string }[] = [
  { id: "todo", label: "Not started" },
  { id: "doing", label: "In progress" },
  { id: "review", label: "In review" },
  { id: "done", label: "Done" },
]

const CACHE = () => local("lab-status")

function cached(): Record<string, Status> {
  try {
    return JSON.parse(localStorage.getItem(CACHE()) ?? "{}")
  } catch {
    return {}
  }
}

function keep(next: Record<string, Status>) {
  try {
    localStorage.setItem(CACHE(), JSON.stringify(next))
  } catch {
    /* Held for this visit only. */
  }
}

/* A lab in review or done remembers how many parts it had then, under its
   status key's `-rounds` twin (`rail-rounds/<lab>`). A round is parts, so when
   the lab has more than it remembers it has gone back to work, and it returns
   to in progress by itself. With a server only what it says counts, so a
   stale copy in the browser never reopens anything. A lab finished before this was here
   starts from the parts it has when first seen. */
const roundsKey = (key: string) => key.replace("/", "-rounds/")
const settled = (status?: string | null) => status === "review" || status === "done"

const post = writeShared

/** `parts` is each lab's part count, by status key. */
export function useLabStatus(parts: Record<string, number>): [Record<string, Status>, (key: string, status: Status | null) => void] {
  const [set, setSet] = useState(cached)

  useEffect(() => {
    let live = true
    ;(hasServer() ? readShared() : Promise.resolve(cached() as Record<string, unknown>))
      .then((held) => {
        if (!live || !held) return
        const next = { ...held } as Record<string, string>
        for (const [key, count] of Object.entries(parts)) {
          if (!settled(next[key])) continue
          const rounds = roundsKey(key)
          const had = Number(next[rounds])
          if (count > had && had) {
            next[key] = "doing"
            delete next[rounds]
            post(key, "doing")
            post(rounds, null)
          } else if (count !== had) {
            next[rounds] = String(count)
            post(rounds, String(count))
          }
        }
        setSet(next as Record<string, Status>)
        keep(next as Record<string, Status>)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  function change(key: string, status: Status | null) {
    const rounds = roundsKey(key)
    const count = settled(status) ? String(parts[key]) : null
    setSet((was) => {
      const next: Record<string, string> = { ...was }
      if (status) next[key] = status
      else delete next[key]
      if (count) next[rounds] = count
      else delete next[rounds]
      keep(next as Record<string, Status>)
      return next as Record<string, Status>
    })
    post(key, status)
    post(rounds, count)
  }

  return [set, change]
}
