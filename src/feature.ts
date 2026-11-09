import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/* A feature on the rail, and the parts in its drawer.

   A file in `src/features/` that default-exports a `Feature` adds it to the
   rail, in filename order, so number them (`01-ground.tsx`) to hold the
   running order. Nothing else needs editing: the lab draws the rail, the
   drawer, Starred and Side by side from this alone. */

export type PartProps = {
  /** Where you are, for the part's head. */
  crumb: ReactNode
  /** What the part asks, behind the head's info mark. */
  about?: string
  /** Opens another part of the same feature, as a Side by side's click does. */
  open: (part: string) => void
}

export type Part = {
  id: string
  name: string
  /** The drawer's heading this part sits under: a round, or Reference. */
  group?: string
  /** The round a part came from when its heading no longer says: a quieter
      label over its rows, and its name in the head. */
  sub?: string
  asks?: string
  /** Shown in the drawer and not yet open. */
  next?: boolean
  Draw: (p: PartProps) => ReactNode
}

export type Feature = {
  id: string
  name: string
  /** Its name on the rail. */
  short: string
  Icon: LucideIcon
  parts: Part[]
  /** No versions to star, so no Starred and no Side by side. */
  starless?: boolean
  /** Its pages use the arrows for themselves, so the lab leaves them be. */
  ownArrows?: boolean
  /** Parts folded into others: an old part's id, and the picks, as a query
      with its new `part`, that open what it showed. */
  moved?: Record<string, string>
  /** One tile on the rail for many labs. Labs that name the same shelf share
      its tile, and the drawer lists them, the open one unfolded to its parts. */
  shelf?: Shelf
}

export type Shelf = {
  id: string
  /** Its name over the drawer. */
  name: string
  /** Its name on the rail. */
  short: string
  Icon: LucideIcon
}
