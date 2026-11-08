import { config } from "./config"

/* The lab server, when there is one: one read per page, shared by the rail's
   statuses, its order and the stars, and a write per change. Without a
   server both do nothing, and each of those keeps its copy in the browser,
   which is then the only copy. */

let read: Promise<Record<string, unknown> | null> | undefined

/** Everything the server holds, or null without a server or when it cannot be reached. */
export function readShared(): Promise<Record<string, unknown> | null> {
  const route = config().server
  if (!route) return Promise.resolve(null)
  read ??= fetch(route)
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => (body?.status && typeof body.status === "object" ? body.status : null))
    .catch(() => null)
  return read
}

/** Sets one key on the server; null clears it. */
export function writeShared(key: string, status: string | null) {
  const route = config().server
  if (!route) return
  fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, status }),
  }).catch(() => {})
}

/** Whether the server, rather than this browser, is the copy that counts. */
export const hasServer = () => !!config().server
