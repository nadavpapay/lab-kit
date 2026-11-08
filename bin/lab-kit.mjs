#!/usr/bin/env node
/* Lab kit's command line.

   lab-kit new <folder> [--name "Acme lab"] [--id acme] [--port 5170] [--from <npm spec>]
     Starts a lab in <folder>: the starter app, its example lab, serve.py and
     a CLAUDE.md, then installs it. --from says where lab-kit itself comes
     from (default: this repo on GitHub; a local clone is `file:../lab-kit`).

   lab-kit skill
     Puts the /lab skill in ~/.claude/skills/lab, so Claude Code knows how
     to work in a lab on this machine. */

import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(readFileSync(join(KIT, "package.json"), "utf8"))
const [cmd, ...rest] = process.argv.slice(2)

function flag(name, fallback) {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback
}

function fail(msg) {
  console.error(`lab-kit: ${msg}`)
  process.exit(1)
}

function walk(dir, f) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    statSync(p).isDirectory() ? walk(p, f) : f(p)
  }
}

function newLab() {
  const target = rest.find((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"))
  if (!target) fail('say where: lab-kit new <folder> [--name "Acme lab"]')
  const dir = resolve(target)
  if (existsSync(dir) && readdirSync(dir).length) fail(`${dir} is not empty`)

  const id = flag("id", basename(dir).toLowerCase().replace(/-?lab$/, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "lab")
  const name = flag("name", `${id.charAt(0).toUpperCase()}${id.slice(1)} lab`)
  const port = flag("port", "5170")
  /* Run from a folder of its own (a clone, or an unzipped copy), the lab links
     to that folder; run with npx, it installs from GitHub. */
  const local = !KIT.split(/[\\/]/).includes("_npx")
  let source = flag("from", local ? `file:${KIT}` : pkg.labKit?.source)
  /* A local clone is named relative to the lab, so the two can move together. */
  if (source.startsWith("file:")) source = `file:${relative(dir, resolve(source.slice(5))) || "."}`

  mkdirSync(dir, { recursive: true })
  cpSync(join(KIT, "template"), dir, { recursive: true })
  cpSync(join(KIT, "serve.py"), join(dir, "serve.py"))
  /* npm drops a file named .gitignore from a package, so it travels without the dot. */
  renameSync(join(dir, "gitignore"), join(dir, ".gitignore"))
  walk(dir, (p) => {
    if (!/\.(json|html|ts|tsx|css|md)$/.test(p)) return
    const s = readFileSync(p, "utf8")
    const t = s.replaceAll("__ID__", id).replaceAll("__NAME__", name).replaceAll("__PORT__", port).replaceAll("__SOURCE__", source)
    if (t !== s) writeFileSync(p, t)
  })

  console.log(`lab-kit: ${name} (${id}) in ${dir}, lab-kit from ${source}`)
  if (!rest.includes("--no-install")) execSync("npm install", { cwd: dir, stdio: "inherit" })
  if (!existsSync(join(dir, ".git"))) {
    try {
      execSync('git init -q && git add -A && git commit -qm "A new lab, from Lab kit"', { cwd: dir, stdio: "ignore" })
    } catch {
      /* No git here: the lab works the same. */
    }
  }
  console.log(`\n  cd ${relative(process.cwd(), dir) || "."}\n  npm run dev     → http://localhost:${port}/lab\n`)
}

function skill() {
  const to = join(homedir(), ".claude", "skills", "lab")
  mkdirSync(to, { recursive: true })
  cpSync(join(KIT, "skill", "lab"), to, { recursive: true })
  console.log(`lab-kit: the /lab skill is in ${to}`)
}

if (cmd === "new") newLab()
else if (cmd === "skill") skill()
else {
  console.log(`lab-kit ${pkg.version}

  lab-kit new <folder> [--name "Acme lab"] [--id acme] [--port 5170] [--from <spec>]
  lab-kit skill`)
}
