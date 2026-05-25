#!/usr/bin/env node
// Tiny CLI shim for `npm run seed:renu-rawat`.
// The actual seed runs in the BROWSER (it writes to localStorage,
// which Node can't reach), so this script just opens the dedicated
// seed page in the user's default browser.
//
// Honors $SEED_URL_BASE if set (default http://localhost:3000) so
// it works against any dev / preview / staging URL.

import { spawn } from "node:child_process"
import { platform } from "node:os"

const BASE = process.env.SEED_URL_BASE ?? "http://localhost:3000"
const TARGET = `${BASE}/seed/renu-rawat`

function openInBrowser(url) {
  const p = platform()
  const [cmd, ...args] =
    p === "darwin"  ? ["open", url] :
    p === "win32"   ? ["cmd", "/c", "start", "", url] :
                      ["xdg-open", url]
  const child = spawn(cmd, args, { stdio: "ignore", detached: true })
  child.on("error", () => {
    console.error(`\n  Couldn't auto-open. Open this URL in your browser:\n  ${url}\n`)
  })
  child.unref()
}

console.log(`
  Seeding the renu-rawat demo tenant.

  Opening: ${TARGET}

  The seed runs in the browser (it writes to localStorage).
  Make sure your dev server is running:
      npm run dev

  Once the page loads, it will auto-seed and show progress.
  Safe to re-run — the seed is idempotent.
`)

openInBrowser(TARGET)
