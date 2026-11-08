import { realpathSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

/* The lab is its own small app. Its code is `~`. To draw a round with the
   project's own components, add an alias to the project's source here, such
   as `"@app": resolve(import.meta.dirname, "../my-app/src")`, and allow it in
   `server.fs.allow`. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "~": resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom", "lucide-react"],
  },
  /* Lab kit ships its source, so Vite compiles it like the lab's own, and
     the packages it uses are named here so Vite still prepares them. */
  optimizeDeps: {
    exclude: ["lab-kit"],
    include: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "lucide-react", "lab-kit > clsx", "lab-kit > tailwind-merge"],
  },
  server: {
    /* Lab kit may be a folder beside the lab rather than inside it. */
    fs: { allow: [import.meta.dirname, realpathSync(resolve(import.meta.dirname, "node_modules/lab-kit"))] },
    port: __PORT__,
    /* Shared stars and statuses, once `npm run serve` is running and
       `server: "/__lab"` is set in main.tsx. */
    proxy: { "/__lab": "http://localhost:5199" },
  },
})
