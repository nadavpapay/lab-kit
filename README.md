# Lab kit

A design lab for any project. Explore a design in rounds of options, star the
ones worth keeping, hold them side by side, and come back to the newest round
next time.

## Start a lab

On any laptop with Node 20 or newer:

```bash
npx github:nadavpapay/lab-kit new my-lab --name "Acme lab"
cd my-lab
npm run dev
```

That writes a small Vite app with one example lab, installs it and makes a
first commit. It opens at `http://localhost:5170/lab`.

Or from a copy of this folder (a clone, or an unzipped zip), with no GitHub
needed. The new lab links to that folder, so keep it where it is:

```bash
cd lab-kit && npm install
node bin/lab-kit.mjs new ../my-lab --name "Acme lab"
```

To teach Claude Code how to work in it, once per machine (or
`node bin/lab-kit.mjs skill` from a copy):

```bash
npx github:nadavpapay/lab-kit skill
```

## What you get

- **Rail** of labs. Drag to reorder. Right-click a tile to set its status
  (Not started, In progress, In review, Done). Done labs fold away at the
  foot, and a lab marked done reopens by itself when a new round lands.
- **Drawer** of rounds: Starred and Side by side on top, then the newest
  round; older ones fold into Archive, newest first.
  The lab opens where you left it, or on a newer round if one has landed.
- **Head** in one row: the link and an info mark, then the round's options
  as letter chips (the picked one shows its name, so 20 fit), then the
  star, See all and Dials on the right. The drawer names where you are, so
  the head names it only while the drawer is hidden. Numbers or ←/→ move
  between options, S stars one, G shows them all at once, and Dials hold
  what is still open, behind one button.
- **Starred** and **Side by side** gather every starred option of a lab.
- **Addresses** are places (`/lab/<lab>/<round>`), and the link mark copies
  the place with what is picked, so a link lands on what you saw.
- **Neutral look**, set by `--lab-*` colours in `src/lab.css`. Set any of
  them in your lab's `app.css` to match the project.

## Add to a lab

A lab is a file in `src/features/` that default-exports a `Feature`; see the
example the starter writes. A round keeps its picked option with `useParam`
and draws its head with `LabHead`; a toggle is `useDial`.

```tsx
const [pick, setPick] = useParam("card", "flat")
const size = useDial("size", "Size", [{ id: "m", name: "Medium" }, { id: "l", name: "Large" }])
<LabHead crumb={crumb} about={about} picks={OPTIONS} picked={pick} onPick={setPick} says="…" dials={[size]} />
```

A round that should take all the room under the head, such as a real page
in a frame, draws inside `Fill` instead of `Stage`.

To draw rounds with the project's own components, add an alias to the
project's source in the lab's `vite.config.ts`.

## Share stars and statuses

By default everything is kept in each browser. To share it with everyone who
opens the lab:

1. Run `npm run serve` (Python 3, nothing to install). It serves the built
   lab and keeps state in `lab-data.json`.
2. Set `server: "/__lab"` in `src/main.tsx`. In dev, Vite passes `/__lab` to
   it.

Anyone who can reach the server can change the stars, so keep it on a
private address.

## Update a lab

```bash
npm update lab-kit
```

Every lab picks up a fix to the frame the same way, so a fix is made once,
here.

## This repo

- `src/` the lab frame (the package). `index.tsx` lists what it exports.
- `template/` the starter `lab-kit new` writes.
- `serve.py` the optional shared-state server, copied into each new lab.
- `skill/lab/` the `/lab` skill for Claude Code.
- `bin/lab-kit.mjs` the `new` and `skill` commands.

Check the frame with `npm install && npm run check`.
