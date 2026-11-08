import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { configureLab, root, type LabConfig } from "./config"
import type { Feature } from "./feature"
import { Lab } from "./lab"
import { atLab } from "./param"

/* Lab kit: everything a lab needs, for any project.

   `mountLab` is the whole of a lab's `main.tsx`: it takes the lab's name and
   its features (a file each in `src/features/`) and draws the lab, with its
   rail, drawer, rounds, stars, Side by side, See all, dials and statuses.
   A round draws itself with `LabHead`, keeps what is picked with `useParam`,
   and adds a toggle with `useDial`. */

export type { LabConfig } from "./config"
export type { Feature, Part, PartProps } from "./feature"
export type { LabPick } from "./head"
export type { Dial, DialOption } from "./dials"
export type { Status } from "./status"
export type { Starred } from "./stars"

export { configureLab } from "./config"
export { Lab } from "./lab"
export { FrameCtx, LabHead } from "./head"
export { Dials, useDial } from "./dials"
export { atLab, linkHere, pickOf, setPick, useParam } from "./param"
export { useOwnArrows } from "./rounds"
export { Segmented, Stage, useSize } from "./stage"
export { cn } from "./cn"

type Files = Record<string, { default: Feature }>

export function mountLab({ features, el, ...c }: LabConfig & { features: Files | Feature[]; el?: HTMLElement }) {
  configureLab(c)
  const list = Array.isArray(features)
    ? features
    : Object.keys(features)
        .sort()
        .map((k) => features[k].default)
  if (!list.length) throw new Error("lab-kit: no features. Add a file to src/features/ that default-exports a Feature.")
  /* The lab is all this app is: any other address opens it. */
  if (!atLab()) window.history.replaceState(null, "", root() + window.location.search)
  createRoot(el ?? document.getElementById("root")!).render(
    <StrictMode>
      <Lab features={list} />
    </StrictMode>,
  )
}
