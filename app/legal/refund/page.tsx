"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function RefundPolicyPage() {
  return (
    <LegalShell
      title="Refund Policy"
      intro="30-day money-back guarantee, no fine print. Here's exactly when we refund and how to request one."
      lastUpdated="May 21, 2026"
    >
      <h2>1. 30-day money-back guarantee</h2>
      <p>
        Every paid plan — Pro and Studio, on any billing period (monthly,
        quarterly, half-yearly, or yearly) — is eligible for a full refund
        within 30 days of the initial purchase, no questions asked. This is
        the same guarantee we show on the homepage and on every pricing
        surface. Email <a href="mailto:hello@thebigclass.com">hello@thebigclass.com</a>&nbsp;from the workspace owner&apos;s email address; refunds are processed within 7 business days to the original payment method.
      </p>

      <h2>2. Free tier</h2>
      <p>
        Starter is free. No card is required; there is nothing to refund.
      </p>

      <h2>3. After the 30-day window</h2>
      <p>
        After day 30 we no longer issue pro-rata refunds. You can still
        cancel any time from <a href="/dashboard/billing">Billing &amp; plan</a>; cancellation takes effect at the end of the current billing cycle and you will not be charged again. You keep paid access until that date.
      </p>

      <h2>4. 14-day free trial of Studio</h2>
      <p>
        New workspaces start on a 14-day Studio trial. No card is required
        to begin the trial — so there is nothing to refund. If you upgrade
        partway through the trial, the 30-day refund window in section 1
        starts on the upgrade payment date, not on signup.
      </p>

      <h2>5. Cancellation by us</h2>
      <p>
        If we cancel your subscription due to a violation of our <a href="/legal/terms">Terms of Service</a>, no refund is provided. If we cancel your subscription for any reason other than a Terms violation, we refund the unused portion of any prepaid period on a pro-rata basis.
      </p>

      <h2>6. Institute (custom) plans</h2>
      <p>
        Institute customers with a custom agreement and uptime commitment
        may be eligible for service credits if monthly uptime drops below
        the contracted threshold. The credit calculation is defined in the
        Institute agreement and supersedes the 30-day window above.
      </p>

      <h2>7. How to request a refund</h2>
      <ol>
        <li>Email <a href="mailto:hello@thebigclass.com">hello@thebigclass.com</a>&nbsp;from the workspace owner&apos;s email.</li>
        <li>Subject line: <em>Refund request — &lt;your workspace slug&gt;</em>.</li>
        <li>Tell us when you signed up and why you&apos;d like to refund.</li>
      </ol>
      <p>
        We confirm receipt within 1 business day and process eligible refunds within 7 business days.
      </p>
    </LegalShell>
  )
}
