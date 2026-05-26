"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      intro="What we collect, why we collect it, and the rights you have over your data."
      lastUpdated="May 17, 2026"
    >
      <h2>1. Who is the data controller</h2>
      <p>
        <strong>Divisocial Tech Solutions Pvt. Ltd.</strong> (&quot;we&quot;) is the data controller for personal information collected through The Big Class. Our registered office is 7-B Race Course Road, Dehradun, Uttarakhand 248001, India.
      </p>
      <p>
        For data you upload about <em>your students</em>, you are the data controller and we are the data processor. The terms governing that relationship are in our <a href="/legal/dpa">Data Processing Addendum</a>.
      </p>

      <h2>2. What we collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Your name, email, WhatsApp number (E.164), country, workspace name, role.</li>
        <li>Authentication tokens used to keep you signed in.</li>
      </ul>
      <h3>Workspace activity</h3>
      <ul>
        <li>Courses, lessons, quizzes, assignments, live class metadata you create.</li>
        <li>Logos, brand colours, and uploaded media (used to render your workspace).</li>
        <li>Settings, integrations, and preferences.</li>
      </ul>
      <h3>Student-facing data you upload</h3>
      <ul>
        <li>Student names, emails, phone numbers, enrolment records.</li>
        <li>Attendance records, quiz attempts, assignment submissions.</li>
      </ul>
      <h3>Usage data</h3>
      <ul>
        <li>Pages visited, features used, error logs — used only to operate and improve the product.</li>
      </ul>

      <h2>3. What we don&apos;t collect</h2>
      <ul>
        <li>We do not collect payment card numbers — those are handled by our PCI-compliant payment processors.</li>
        <li>We do not use third-party advertising trackers. You will not see Google Ads, Facebook Pixel, or other ad-network beacons on our product surfaces.</li>
        <li>We do not use your Content, or your students&apos; Content, to train artificial-intelligence models.</li>
      </ul>

      <h2>4. How we use it</h2>
      <ul>
        <li>To operate the service — render your workspace, deliver classes, send reminders, process payments.</li>
        <li>To send transactional emails and WhatsApp messages (account verification, password reset, class invites) using the senders you configure.</li>
        <li>To detect abuse, fraud, and security incidents.</li>
        <li>To improve the product (anonymised usage analytics).</li>
        <li>To send product updates — you can opt out from your account settings.</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        We use a minimal set of first-party cookies and localStorage entries to keep you signed in, remember your workspace, and remember your preferences. See our <a href="/legal/cookies">Cookies Policy</a> for the full list.
      </p>

      <h2>6. Sub-processors</h2>
      <p>
        We use the following sub-processors to run the service. They are bound by data-processing terms equivalent to or stricter than these:
      </p>
      <ul>
        <li><strong>Cloud hosting</strong> — Amazon Web Services (Mumbai region by default; EU / US on request for Scale).</li>
        <li><strong>Transactional email</strong> — ZeptoMail by Zoho Corporation.</li>
        <li><strong>WhatsApp delivery</strong> — Meta Platforms Inc. (via WhatsApp Business API, when you connect your sender).</li>
        <li><strong>Video conferencing</strong> — Google Meet / Zoom / Microsoft Teams (only when you choose to use them).</li>
        <li><strong>Payments</strong> — your chosen processor (e.g. Razorpay, Stripe).</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate or incomplete data.</li>
        <li>Request deletion of your data (subject to legal retention requirements).</li>
        <li>Export your workspace data in a portable format.</li>
        <li>Object to or restrict certain processing.</li>
        <li>Lodge a complaint with a data protection authority.</li>
      </ul>
      <p>
        Email <a href="mailto:welcome@thebigclass.com">welcome@thebigclass.com</a> to exercise any of these rights. We respond within 30 days.
      </p>

      <h2>8. Data retention</h2>
      <p>
        We retain workspace data for as long as your workspace is active. After cancellation, your data is retained for 30 days to allow re-activation or export, after which it is permanently deleted from our production systems.
      </p>

      <h2>9. International transfers</h2>
      <p>
        Your data is hosted in India by default. For Scale customers we can host data in EU or US regions. When personal data crosses borders, we rely on Standard Contractual Clauses (SCCs) or equivalent legal mechanisms.
      </p>

      <h2>10. Children</h2>
      <p>
        The Big Class is not directed at children under 13. If you are a school or institute teaching minors, the Workspace Owner is responsible for obtaining the consents required under applicable law and confirms by using the platform that those consents are in place.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We will notify you of material changes via email and an in-app announcement. The &quot;last updated&quot; date at the top of this policy tells you when it was last revised.
      </p>

      <h2>12. Representatives</h2>
      <p>
        For UK and EEA-specific representatives, see our <a href="/legal/uk-privacy">UK Privacy Representation</a> and <a href="/legal/gdpr">GDPR Representation</a> pages.
      </p>
    </LegalShell>
  )
}
