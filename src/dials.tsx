import { useParam } from "./param"

/* The row of toggles under a lab's head: one dial per choice still open, always
   in the same place, each saying what it sets, with a way back to where the
   round started. A state of the design (hover, empty, error) is a dial like
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
