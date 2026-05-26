"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      intro="The legal agreement between you and Divisocial Tech Solutions Pvt. Ltd. for use of The Big Class platform."
      lastUpdated="May 17, 2026"
    >
      <h2>1. Who you&apos;re contracting with</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of The Big Class — a teaching workspace operated by <strong>Divisocial Tech Solutions Pvt. Ltd.</strong>, a company incorporated in India with its registered office at 7-B Race Course Road, Dehradun, Uttarakhand 248001 (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
      </p>
      <p>
        By creating a workspace, signing in, or using any part of the service you agree to these Terms. If you do not agree, do not use the service.
      </p>

      <h2>2. Your account &amp; workspace</h2>
      <p>
        Each workspace is owned by one person or organisation (the &quot;Workspace Owner&quot;). The Workspace Owner is responsible for inviting team members (admins, instructors) and for ensuring those users follow these Terms. You must provide accurate sign-up information, including a working email address and WhatsApp number for account recovery and class reminders.
      </p>
      <p>
        You are responsible for keeping your password and authentication tokens secure. We are not liable for losses resulting from unauthorised use of credentials you failed to protect.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to use The Big Class to:</p>
      <ul>
        <li>Distribute malware, run phishing, or compromise other users.</li>
        <li>Upload, share, or sell content that infringes intellectual property, contains illegal material, or violates Indian law or the laws of jurisdictions you operate in.</li>
        <li>Send unsolicited bulk messages (spam) through any of our messaging integrations.</li>
        <li>Resell, white-label, or sublicense the platform without a separate written agreement.</li>
        <li>Attempt to reverse-engineer, scrape at abusive rates, or bypass rate limits.</li>
      </ul>
      <p>We reserve the right to suspend or terminate workspaces that violate these conditions.</p>

      <h2>4. Your content stays yours</h2>
      <p>
        You retain all ownership rights to the courses, classes, materials, student data, and other content you upload (your &quot;Content&quot;). You grant us a limited, worldwide licence to host, transmit, and process your Content only as necessary to operate the service for you — including backups, delivery to enrolled students, and rendering on public pages you have published (your store, your Wall of Love, your verification page).
      </p>
      <p>
        We do not use your Content to train AI models. We do not sell your Content to third parties.
      </p>

      <h2>5. Plans &amp; payment</h2>
      <p>
        Starter is free. Paid plans (Growth, Scale) are billed monthly or annually in advance. All prices are listed exclusive of GST or other applicable taxes, which we add at checkout where required by law.
      </p>
      <p>
        Annual plans are paid up front. Monthly plans renew automatically until cancelled. You can cancel from the dashboard at any time; cancellation takes effect at the end of the then-current billing cycle. We do not pro-rate refunds for partial months. For full refund terms see our <a href="/legal/refund">Refund Policy</a>.
      </p>

      <h2>6. Third-party services</h2>
      <p>
        The Big Class integrates with third-party services you choose to connect — for example Google Meet, Zoom, Microsoft Teams, ZeptoMail, WhatsApp Business API, and payment processors. Your use of those services is governed by their own terms. We are not responsible for outages or behaviour of third-party providers.
      </p>

      <h2>7. Availability &amp; changes</h2>
      <p>
        We work hard to keep the service available, but do not guarantee uninterrupted access. For Scale customers, uptime commitments and remedies are documented in a separate written agreement.
      </p>
      <p>
        We may add, remove, or change features. Material changes that adversely affect your use will be announced at least 30 days in advance via email and the in-app announcement system.
      </p>

      <h2>8. Termination</h2>
      <p>
        You can delete your workspace at any time. We may suspend or terminate access if you breach these Terms, fail to pay, or use the platform in a way that exposes us to legal risk. On termination we will provide a 30-day window for you to export your data; after that window your data may be permanently deleted.
      </p>

      <h2>9. Disclaimers &amp; liability</h2>
      <p>
        The service is provided &quot;as is&quot;. To the maximum extent permitted by law, we disclaim all warranties not expressly stated in these Terms. Our total liability for any claim arising out of or related to the service is limited to the amounts you paid us in the twelve months preceding the claim.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Courts at Dehradun, Uttarakhand, India shall have exclusive jurisdiction over any disputes, except where applicable consumer protection law requires otherwise.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions? Email <a href="mailto:welcome@thebigclass.com">welcome@thebigclass.com</a> or write to us at the registered office below.
      </p>
    </LegalShell>
  )
}
