"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function TakedownPolicyPage() {
  return (
    <LegalShell
      title="Take-down Policy"
      intro="How to report content hosted on The Big Class that you believe infringes copyright or otherwise violates the law."
      lastUpdated="May 17, 2026"
    >
      <h2>1. Our position</h2>
      <p>
        The Big Class is a platform that lets teachers and institutions publish their own courses, classes, store products, certificates, and community content. We do not pre-screen what users upload, but we act on valid take-down requests promptly.
      </p>

      <h2>2. Submitting a notice</h2>
      <p>
        Send notices to <a href="mailto:legal@thebigclass.com">legal@thebigclass.com</a>. To be actionable, your notice must include:
      </p>
      <ol>
        <li>Your full name, address, telephone number, and email.</li>
        <li>A clear identification of the work you claim has been infringed (with a URL or registration number where available).</li>
        <li>The exact URL on The Big Class of the allegedly infringing material.</li>
        <li>A statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent, or the law.</li>
        <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are authorised to act on behalf of the owner.</li>
        <li>Your physical or electronic signature.</li>
      </ol>

      <h2>3. What happens next</h2>
      <ul>
        <li>We acknowledge receipt within 1 business day.</li>
        <li>We review the notice and, if valid, remove or disable access to the material.</li>
        <li>We notify the affected user, with a copy of your notice, so they may respond or file a counter-notice.</li>
        <li>Repeat infringers will have their workspaces suspended or terminated.</li>
      </ul>

      <h2>4. Counter-notice</h2>
      <p>
        If your content was removed and you believe the removal was a mistake or misidentification, you can submit a counter-notice to <a href="mailto:legal@thebigclass.com">legal@thebigclass.com</a> containing your identifying information, the URL of the removed material, and a statement under penalty of perjury that you have a good-faith belief the material was removed due to mistake or misidentification.
      </p>

      <h2>5. Other illegal content</h2>
      <p>
        For non-copyright take-downs — defamation, court orders, child safety, fraud, threats — email <a href="mailto:legal@thebigclass.com">legal@thebigclass.com</a> with a clear description of the issue and the URL. We act on credible reports promptly and cooperate with lawful requests from authorities.
      </p>

      <h2>6. Bad-faith claims</h2>
      <p>
        Knowingly false take-down notices may be subject to liability under applicable law. Submit your notice in good faith.
      </p>
    </LegalShell>
  )
}
