"use client"

// Student-side mirror of /dashboard/status. Same probes, same UI —
// just rendered inside the tenant-branded student layout so a learner
// debugging "is the backend even up?" sees the same diagnostic
// information their workspace admin sees, with the same recovery
// hints. The page component itself is shared.

export { default } from "@/app/dashboard/status/page"
