import { useEffect, useState } from "react"
import { Check, Link2 } from "lucide-react"

import { linkHere } from "./param"

/* The address shows only where you are; this copies where you are with what
   is picked, so a link lands on the page as it was seen. It sits after the
   page's name, quiet until it is wanted, and says so when it has copied. */
export function CopyLink() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1600)
    return () => clearTimeout(t)
  }, [done])

  function copy() {
    navigator.clipboard
      ?.writeText(linkHere())
      .then(() => setDone(true))
      .catch(() => {})
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={done ? "Link copied" : "Copy link"}
      title={done ? undefined : "Copy link to this page as it is"}
      className="flex h-6 cursor-pointer items-center gap-1 rounded-md px-1 text-xs text-(--lab-quiet) outline-none hover:text-(--lab-ink) focus-visible:ring-2 focus-visible:ring-(--lab-ring)"
    >
      {done ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
      {done && <span>Copied</span>}
    </button>
  )
}
