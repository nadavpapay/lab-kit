/* What makes one lab its own: its name, where its addresses start, and
   whether its stars, statuses and rail order are shared through a server.

   Everything the lab keeps is named after `id`, in the browser and on the
   server, so two labs on one machine, or on one server, never mix. Set it
   once, before the lab draws (`mountLab` does). */

export type LabConfig = {
  /** A short id for this lab, such as "acme". Keeps its saved state apart from every other lab's. */
  id: string
  /** The lab's name, for the tab: "<name> · <lab on screen>". */
  name: string
  /** The site's base path, as Vite's `import.meta.env.BASE_URL` says it. Default "/". */
  base?: string
  /** The route a lab server answers on (see `serve.py`), such as "/__lab". Left out, everything is kept in this browser only. */
  server?: string | false
  /** The tab icon while the lab is open. Left out, the page's own icon stays. */
  icon?: string
}

type Held = Required<Omit<LabConfig, "icon" | "server">> & { icon?: string; server: string | false }

let held: Held | undefined

export function configureLab(c: LabConfig) {
  if (!/^[a-z0-9-]+$/.test(c.id)) throw new Error(`lab-kit: id "${c.id}" must be lowercase letters, digits and dashes`)
  held = { base: "/", server: false, ...c }
}

export function config(): Held {
  if (!held) throw new Error("lab-kit: call configureLab (or mountLab) before the lab draws")
  return held
}

/** A name for something kept in this browser, apart from every other lab's. */
export const local = (name: string) => `lab-kit:${config().id}:${name}`

/** Where the lab's places start: `<base>lab`. */
export const root = () => `${config().base}lab`.replace(/\/{2,}/g, "/")

/** The keys this lab uses on the server. */
export const keys = {
  status: (lab: string) => `${config().id}-rail/${lab}`,
  starPrefix: () => `star-${config().id}-`,
  railOrder: () => `rail-order/${config().id}`,
}
