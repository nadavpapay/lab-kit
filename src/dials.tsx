import { Fragment, useEffect, useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"

import { cn } from "./cn"
import { useParam } from "./param"

/* The toggles a round still has open: one dial per choice, each saying what
   it sets, with a way back to where the round started. The head keeps them
   behind one button (`DialsMenu`); `Dials` draws them as a row for a page
   that wants them out. A state of the design (hover, empty, error) is a dial like
   any other. A dial is a pick, so it rides in a star, a copied link and every
   frame of See all.

   A round passes `dials={[useDial(...), useDial(...)]}` to its `LabHead`. */

export type DialOption = { id: string; name: string; title?: string }

export type Dial = {
  key: string
  name: string
  options: readonly DialOption[]
  value: string
  fallback: string
  onChange: (id: string) => void
}

/** One toggle, kept as a pick under `key`. It starts on `fallback`, or its first option. */
export function useDial(key: string, name: string, options: readonly DialOption[], fallback = options[0].id): Dial {
  const [value, set] = useParam(key, fallback)
  return { key, name, options, fallback, value: options.some((o) => o.id === value) ? value : fallback, onChange: set }
}

export function Dials({ dials }: { dials: readonly Dial[] }) {
  const moved = dials.filter((d) => d.value !== d.fallback)
  return (
    <div className="flex min-h-7 flex-wrap items-center gap-x-4 gap-y-2">
      {dials.map((d) => (
        <div key={d.key} role="radiogroup" aria-label={d.name} className="flex items-center gap-2">
          <span className="text-xs leading-4 text-(--lab-quiet)">{d.name}</span>
          <div className="flex h-7 items-center rounded-md border border-(--lab-line) bg-(--lab-paper)/70 p-0.5">
            {d.options.map((o) => {
              const on = o.id === d.value
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={o.title}
                  onClick={() => d.onChange(o.id)}
                  className={`flex h-full cursor-pointer items-center rounded-[5px] px-2 text-xs leading-none outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring) ${on ? "bg-(--lab-ink) text-(--lab-paper)" : "text-(--lab-muted) hover:text-(--lab-ink)"}`}
                >
                  {o.name}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {moved.length > 0 && (
        <button
          type="button"
          onClick={() => moved.forEach((d) => d.onChange(d.fallback))}
          className="h-7 cursor-pointer rounded-md px-2 text-xs leading-none text-(--lab-quiet) outline-none hover:text-(--lab-ink) focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
        >
          Reset
        </button>
      )}
    </div>
  )
}

/** The dials behind one button in the head, so the head stays two lines. The
    button counts them, and marks when any is set away from where it started.
    It closes on Escape, on a click outside, and on a click into a framed page. */
export function DialsMenu({ dials }: { dials: readonly Dial[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const moved = dials.filter((d) => d.value !== d.fallback)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    window.addEventListener("blur", close)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("blur", close)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title={moved.length ? `${moved.length} set away from the start` : undefined}
        className={cn(
          "flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs leading-none outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
          open ? "border-(--lab-ink) bg-(--lab-ink) text-(--lab-paper)" : "border-(--lab-line) bg-(--lab-paper)/70 hover:bg-(--lab-paper)",
        )}
      >
        <SlidersHorizontal aria-hidden className="size-3.5" />
        Dials
        <span className={cn("text-[11px] tabular-nums", open ? "opacity-60" : "text-(--lab-quiet)")}>{dials.length}</span>
        {moved.length > 0 && <span aria-hidden className="size-1.5 rounded-full bg-(--lab-star)" />}
      </button>
      {open && (
        <div className="lab-pop absolute top-full right-0 z-30 mt-1 flex flex-col gap-2 rounded-lg border border-(--lab-line) bg-(--lab-paper) p-3 shadow-md">
          <div className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-2">
            {dials.map((d) => (
              <Fragment key={d.key}>
                <span className="text-xs leading-4 whitespace-nowrap text-(--lab-muted)">{d.name}</span>
                <DialSwitch dial={d} />
              </Fragment>
            ))}
          </div>
          {moved.length > 0 && (
            <button
              type="button"
              onClick={() => moved.forEach((d) => d.onChange(d.fallback))}
              className="-mb-1 h-7 cursor-pointer self-end rounded-md px-2 text-xs leading-none text-(--lab-quiet) outline-none hover:text-(--lab-ink) focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
            >
              Reset {moved.length === 1 ? "1 dial" : `${moved.length} dials`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** One dial's options, side by side. */
function DialSwitch({ dial: d }: { dial: Dial }) {
  return (
    <div role="radiogroup" aria-label={d.name} className="flex h-7 w-fit items-center rounded-md border border-(--lab-line) bg-(--lab-chrome)/60 p-0.5">
      {d.options.map((o) => {
        const on = o.id === d.value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => d.onChange(o.id)}
            className={cn(
              "flex h-full cursor-pointer items-center rounded-[5px] px-2 text-xs leading-none whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-(--lab-ring)",
              on ? "bg-(--lab-ink) text-(--lab-paper)" : "text-(--lab-muted) hover:text-(--lab-ink)",
            )}
          >
            {o.name}
          </button>
        )
      })}
    </div>
  )
}
