---
name: lab
description: Work in a design lab built on Lab kit — start a new lab, add a lab to its rail, add a round of options, add dials, or record a pick. Use in a project whose CLAUDE.md says it is built on Lab kit, or when the user asks to start a lab with Lab kit. Not for labs that have their own frame.
---

# Working in a Lab kit lab

A lab is a small app for exploring design options in rounds. The person
picks between options in the head, stars the ones they like, sees them side
by side, and comes back to the newest round next time. Lab kit draws all of
that; your job is the rounds.

## Starting a lab in a project

```bash
npx github:nadavpapay/lab-kit new <folder> --name "Acme lab"
```

It writes the starter beside the project (its own small Vite app), installs
it and makes a first commit. `npm run dev` opens it at `/lab`. To draw rounds
with the project's real components, add an alias to the project's `src` in
the lab's `vite.config.ts`.

## The shape

- **Lab** = one file in `src/features/`, default-exporting a `Feature`. Number
  files (`01-cards.tsx`) to hold the rail's order. Nothing else needs editing.
- **Part** = one row in the drawer, usually one round. `group: "Round 3"`
  puts it under that round; older rounds fold into Archive by themselves.
  Put the newest round first in `parts`. A part with no round in its group
  (Final, Reference) never folds.
- **Options** = the versions in the head. Keep the picked one with
  `useParam("<key>", "<default>")` and pass `picks`, `picked`, `onPick` and
  `says` to `LabHead`. Name options `A · Flat`, `B · Raised`; letters keep
  counting across rounds of one lab (Round 2 starts where Round 1 ended).
- **Dials** = what is still open inside an option (size, state, density):
  `useDial("<key>", "<Name>", [{ id, name, title? }])`, passed as
  `dials={[...]}`. A state (hover, empty, error) is a dial too. A take on an
  option is a dial, not a new lab.
- **asks** = one or two sentences on what the round is asking. **says** =
  what the picked option does, one line. Both sit behind the info mark.

## Rules

- Every pick goes through `useParam` or `useDial`, never component state and
  never `window.location`. That is what makes stars, copied links, Side by
  side and See all (G) work.
- Never key a param or dial `lab`, `part`, `star`, `see`, `frame` or `v`; the
  lab uses them.
- A round's picks need distinct keys from other rounds of the same lab when
  their options differ (`d`, `l`, `m`), so a star reopens the right one.
- A page that uses the arrow keys itself calls `useOwnArrows()`, or the
  feature sets `ownArrows: true`.
- Draw options with the project's real components and tokens. Never invent
  UI the product doesn't have unless the round is about that new UI.
- Shown in a frame at a fixed width (a whole page)? `useSize` and `Stage`
  scale it; `Fill` gives it all the room under the head. See the README.
- Several labs about one thing share one rail tile with `shelf`.
- When the person picks, write the pick into the round's `asks` or a short
  note, make it the default, and stop offering the others in new work.

## Keys the person can use

Numbers or ←/→ between options · ↑/↓ between drawer rows · S star ·
G see all · Esc close · ⌘\ hide the drawer · right-click a rail tile to set
its status (Not started, In progress, In review, Done).

## Updating

`npm update lab-kit` in the lab takes the newest frame. A fix to the frame
goes in the lab-kit repo, never in a lab's `node_modules`.
