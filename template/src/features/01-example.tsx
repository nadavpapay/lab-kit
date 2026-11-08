import { FlaskConical } from "lucide-react"
import { LabHead, useDial, useParam, type Feature, type PartProps } from "lab-kit"

/* An example lab, to show the shape. Delete it once your first lab is in.

   A lab is a feature with parts. Each part is a round: a few options picked
   in the head (numbers or arrows), each one starrable (S), all of them side
   by side (G), with dials for what is still open. The newest round shows;
   older rounds fold into Archive by themselves, read from `group`. */

const CARDS = [
  { id: "flat", name: "A · Flat", says: "No shadow, a hairline round it. The calmest." },
  { id: "raised", name: "B · Raised", says: "A soft shadow lifts it off the page." },
  { id: "filled", name: "C · Filled", says: "A tinted ground, no border, for a denser page." },
] as const

function Cards({ crumb, about }: PartProps) {
  /* What is picked is a pick: it rides in stars, copied links and See all. */
  const [pick, setPick] = useParam("card", "flat")
  const card = CARDS.find((c) => c.id === pick) ?? CARDS[0]
  const size = useDial("size", "Size", [
    { id: "m", name: "Medium" },
    { id: "l", name: "Large" },
  ])
  const state = useDial("state", "State", [
    { id: "rest", name: "Rest" },
    { id: "empty", name: "Empty", title: "Nothing in it yet" },
  ])

  return (
    <>
      <LabHead
        className="px-6 pt-4 pb-3"
        crumb={crumb}
        about={about}
        picks={CARDS.map((c) => ({ id: c.id, name: c.name }))}
        picked={card.id}
        onPick={setPick}
        says={card.says}
        dials={[size, state]}
      />
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className={[
            "flex flex-col gap-2 rounded-xl p-6",
            size.value === "l" ? "w-[420px]" : "w-[300px]",
            card.id === "flat" && "border border-black/10 bg-white",
            card.id === "raised" && "bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.10)]",
            card.id === "filled" && "bg-black/[0.04]",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="m-0 text-sm font-medium">{state.value === "empty" ? "Nothing here yet" : "Weekly report"}</p>
          <p className="m-0 text-sm text-black/60">{state.value === "empty" ? "Add a source to start." : "Ready on Monday, from three sources."}</p>
        </div>
      </div>
    </>
  )
}

const FIRST = [
  { id: "round", name: "A · Round", says: "Large corners." },
  { id: "square", name: "B · Square", says: "Small corners." },
] as const

function First({ crumb, about }: PartProps) {
  const [pick, setPick] = useParam("first", "round")
  const t = FIRST.find((c) => c.id === pick) ?? FIRST[0]
  return (
    <>
      <LabHead className="px-6 pt-4 pb-3" crumb={crumb} about={about} picks={FIRST.map((c) => ({ id: c.id, name: c.name }))} picked={t.id} onPick={setPick} says={t.says} />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className={`h-40 w-64 border border-black/10 bg-white ${t.id === "round" ? "rounded-3xl" : "rounded-md"}`} />
      </div>
    </>
  )
}

const feature: Feature = {
  id: "example",
  name: "Example",
  short: "Example",
  Icon: FlaskConical,
  parts: [
    {
      id: "cards",
      name: "Three cards",
      group: "Round 2",
      asks: "What the round is asking, in a sentence or two. It sits behind the info mark in the head.",
      Draw: Cards,
    },
    {
      id: "first",
      name: "Corners",
      group: "Round 1",
      asks: "An older round. It folds into Archive once a newer round is in.",
      Draw: First,
    },
  ],
}

export default feature
