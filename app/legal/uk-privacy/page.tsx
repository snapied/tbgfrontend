"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function UkPrivacyPage() {
  return (
    <LegalShell
      title="UK Privacy Representation"
      intro="Information for data subjects in the United Kingdom regarding our handling of personal data under the UK GDPR and the Data Protection Act 2018."
      lastUpdated="May 17, 2026"
    >
      <h2>1. Who we are</h2>
      <p>
        <strong>Divisocial Tech Solutions Pvt. Ltd.</strong> (&quot;we&quot;) is the data controller for personal data we collect from users of The Big Class. We are incorporated in India with our registered office at 7-B Race Course Road, Dehradun, Uttarakhand 248001, India.
      </p>

      <h2>2. Status under UK law</h2>
      <p>
        We are established outside the United Kingdom. When we process personal data of data subjects in the UK in connection with offering services to those data subjects, the UK GDPR applies.
      </p>

      <h2>3. Lawful bases</h2>
      <p>The lawful bases we rely on when processing personal data of UK data subjects are:</p>
      <ul>
        <li><strong>Performance of a contract</strong> — to deliver the service to you and your workspace.</li>
        <li><strong>Legitimate interest</strong> — to operate, secure, and improve the platform.</li>
        <li><strong>Consent</strong> — where required for optional features (e.g. marketing emails).</li>
        <li><strong>Legal obligation</strong> — to comply with applicable laws.</li>
      </ul>

      <h2>4. Your rights</h2>
      <p>
        Under the UK GDPR you have the rights set out in our <a href="/legal/privacy">Privacy Policy</a> — access, rectification, erasure, restriction, portability, objection, and the right to withdraw consent.
      </p>

      <h2>5. UK representative</h2>
      <p>
        Where required under Article 27 of the UK GDPR, we appoint a UK-based representative. To request representative details, write to <a href="mailto:hello@thebigclass.com">hello@thebigclass.com</a> with the subject line &quot;UK Representative&quot; and we will share current representative information.
      </p>

      <h2>6. International transfers</h2>
      <p>
        When personal data is transferred from the UK to India or to other countries outside the UK, we rely on the UK International Data Transfer Addendum to the EU Standard Contractual Clauses (or, where applicable, the UK IDTA).
      </p>

      <h2>7. Complaints</h2>
      <p>
        If you believe your data has been mishandled, please contact us first at <a href="mailto:hello@thebigclass.com">hello@thebigclass.com</a>. You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.
      </p>
    </LegalShell>
  )
}
