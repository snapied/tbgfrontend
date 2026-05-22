"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function AffiliateTermsPage() {
  return (
    <LegalShell
      title="Affiliate Terms"
      intro="Rules of the road for our Refer & Earn programme — how rewards are calculated, paid, and revoked."
      lastUpdated="May 17, 2026"
    >
      <h2>1. The programme</h2>
      <p>
        The Big Class Refer &amp; Earn programme lets any Workspace Owner share a personal invite link with friends and colleagues. When an invitee creates a paid workspace through your link, you earn the reward defined in your account at the time the invite is generated.
      </p>

      <h2>2. The current reward</h2>
      <p>
        The reward is <strong>one month free</strong> on your current paid plan for every friend who joins through your personal link. Rewards are stackable; there is no per-account cap. Free months are credited to your workspace billing cycle and reduce your next invoice by one billing period each.
      </p>

      <h2>3. Attribution</h2>
      <ul>
        <li>Attribution is captured the moment your invitee completes signup using your <code>/r/&lt;code&gt;</code> link or the <code>?ref=&lt;code&gt;</code> query parameter.</li>
        <li>Only the first successful signup per invite code is counted; subsequent signups with the same code are ignored.</li>
        <li>Self-referrals, internal team-member signups, and signups from the same payment instrument as the referrer do not qualify.</li>
      </ul>

      <h2>4. When rewards are credited</h2>
      <p>
        Once the invitee has been on a paid plan for 30 consecutive days without cancellation or charge reversal, the reward is credited to your account and the invite status moves from &quot;Joined&quot; to &quot;Rewarded&quot;.
      </p>

      <h2>5. Disqualification</h2>
      <p>We reserve the right to revoke rewards and suspend programme access if we detect:</p>
      <ul>
        <li>Spam — sending invite links to people you do not know personally.</li>
        <li>Self-dealing — creating fake accounts to refer yourself.</li>
        <li>Misrepresentation of the platform in your outreach.</li>
        <li>Any other behaviour that violates our <a href="/legal/terms">Terms of Service</a>.</li>
      </ul>

      <h2>6. Programme changes</h2>
      <p>
        We may change the reward amount or programme rules at any time with at least 30 days&apos; notice. Already-credited rewards are honoured; pending invites generated under prior rules are honoured at the rate in effect when the invite was created.
      </p>

      <h2>7. Tax</h2>
      <p>
        Where applicable, you are responsible for any tax obligations on rewards earned. Free service credits are not treated as cash compensation.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about the programme? Email <a href="mailto:hello@thebigclass.com">hello@thebigclass.com</a>.
      </p>
    </LegalShell>
  )
}
