"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function CookiesPage() {
  return (
    <LegalShell
      title="Cookies Policy"
      intro="The cookies and browser-storage entries we set, what each one is for, and how long it stays."
      lastUpdated="May 17, 2026"
    >
      <h2>1. What we use storage for</h2>
      <p>
        The Big Class uses a small set of first-party cookies and <code>localStorage</code> entries. We do not run third-party advertising trackers (no Google Ads pixel, Facebook Pixel, TikTok pixel, etc.) on our product surfaces.
      </p>

      <h2>2. Essential</h2>
      <p>These are required for the service to work. Disabling them will break sign-in and your workspace.</p>
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Purpose</th><th>Lifetime</th></tr>
        </thead>
        <tbody>
          <tr><td><code>tbc.session</code></td><td>HTTP cookie</td><td>Keeps you signed in</td><td>Session</td></tr>
          <tr><td><code>thebigclass.platform.currentTenant.v1</code></td><td>localStorage</td><td>Remembers your active workspace</td><td>Until you sign out</td></tr>
          <tr><td><code>thebigclass.t.&lt;slug&gt;.*.v1</code></td><td>localStorage</td><td>Your workspace data namespaces (users, courses, sessions, etc.)</td><td>Until cleared</td></tr>
        </tbody>
      </table>

      <h2>3. Functional</h2>
      <p>Improve the experience but you can disable them without breaking sign-in.</p>
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Purpose</th><th>Lifetime</th></tr>
        </thead>
        <tbody>
          <tr><td><code>tbc.theme</code></td><td>localStorage</td><td>Remembers light / dark preference</td><td>1 year</td></tr>
          <tr><td><code>thebigclass.global.pendingRef.v1</code></td><td>localStorage</td><td>Stores a referral code from a <code>/r/&lt;code&gt;</code> landing page so it survives until you finish signup</td><td>Until signup completes</td></tr>
        </tbody>
      </table>

      <h2>4. Analytics</h2>
      <p>
        We use a privacy-respecting first-party analytics endpoint to measure aggregate usage of the marketing site and the dashboard. Events are anonymised and never tied to a single user.
      </p>

      <h2>5. Third-party services you enable</h2>
      <p>
        Some workspace features rely on third parties (video conferencing, email delivery, WhatsApp, payments). Those providers may set their own cookies when you embed or open their tools — their policies govern that.
      </p>

      <h2>6. Managing your cookies</h2>
      <p>
        You can clear cookies and localStorage at any time from your browser. Clearing them while signed in will sign you out and reset workspace preferences.
      </p>
    </LegalShell>
  )
}
