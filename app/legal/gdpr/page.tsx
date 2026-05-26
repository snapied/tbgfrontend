"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function GdprPage() {
  return (
    <LegalShell
      title="GDPR Representation"
      intro="Information for data subjects in the European Economic Area regarding our compliance with the General Data Protection Regulation (EU) 2016/679."
      lastUpdated="May 17, 2026"
    >
      <h2>1. Who we are</h2>
      <p>
        <strong>Divisocial Tech Solutions Pvt. Ltd.</strong> (&quot;we&quot;) is the data controller for personal data we collect about you. We are incorporated in India with our registered office at 7-B Race Course Road, Dehradun, Uttarakhand 248001, India.
      </p>

      <h2>2. Status under EU law</h2>
      <p>
        We are established outside the European Union. The GDPR applies to our processing of personal data of data subjects in the EU when we are offering services to them.
      </p>

      <h2>3. Lawful bases</h2>
      <p>The lawful bases we rely on are the same as outlined in our <a href="/legal/uk-privacy">UK Privacy Representation</a>: contract performance, legitimate interest, consent, and legal obligation.</p>

      <h2>4. Your rights under the GDPR</h2>
      <ul>
        <li>Right of access (Art. 15).</li>
        <li>Right to rectification (Art. 16).</li>
        <li>Right to erasure / &quot;right to be forgotten&quot; (Art. 17).</li>
        <li>Right to restrict processing (Art. 18).</li>
        <li>Right to data portability (Art. 20).</li>
        <li>Right to object (Art. 21).</li>
        <li>Rights related to automated decision-making (Art. 22) — we do not engage in such processing.</li>
      </ul>

      <h2>5. EU representative</h2>
      <p>
        Where required under Article 27 of the GDPR, we have appointed an EU-based representative. To request the representative&apos;s details for data-subject communications, contact <a href="mailto:welcome@thebigclass.com">welcome@thebigclass.com</a> with the subject line &quot;EU Representative&quot;.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Personal data transferred from the EEA to India relies on the European Commission&apos;s Standard Contractual Clauses (2021/914/EU) and, where applicable, supplementary measures.
      </p>

      <h2>7. Supervisory authority</h2>
      <p>
        You may lodge a complaint with your local data protection authority. A list of EU supervisory authorities is available at <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noreferrer">edpb.europa.eu</a>.
      </p>

      <h2>8. Contact</h2>
      <p>
        For any data-subject request or GDPR-related question, email <a href="mailto:welcome@thebigclass.com">welcome@thebigclass.com</a>. We respond within 30 days.
      </p>
    </LegalShell>
  )
}
