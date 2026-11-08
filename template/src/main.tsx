import { mountLab } from "lab-kit"
import "lab-kit/lab.css"
import "./app.css"

/* A file in `src/features/` adds a lab to the rail, in filename order. */
mountLab({
  id: "__ID__",
  name: "__NAME__",
  base: import.meta.env.BASE_URL,
  /* Stars, statuses and rail order are kept in this browser. To share them
     with everyone who opens the lab, run `npm run serve` and set this to
     "/__lab". */
  server: false,
  features: import.meta.glob("./features/*.tsx", { eager: true }),
})
