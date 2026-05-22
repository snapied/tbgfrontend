"use client"

import { LegalShell } from "@/components/landing/legal-shell"

export default function DpaPage() {
  return (
    <LegalShell
      title="Data Processing Addendum"
      intro="The terms under which Divisocial processes personal data on behalf of customers (Workspace Owners) who use The Big Class."
      lastUpdated="May 17, 2026"
    >
      <h2>1. Scope</h2>
      <p>
        This Data Processing Addendum (&quot;DPA&quot;) supplements the <a href="/legal/terms">Terms of Service</a> between you (the &quot;Customer&quot; or &quot;Controller&quot;) and Divisocial Tech Solutions Pvt. Ltd. (&quot;Processor&quot;), and governs the processing of Personal Data carried out by us on your behalf when you use The Big Class.
      </p>

      <h2>2. Roles</h2>
      <p>
        With respect to Personal Data about your students, team members, customers, and other end users that you upload or instruct us to process, you are the Controller and we are the Processor.
      </p>

      <h2>3. Categories of data &amp; data subjects</h2>
      <ul>
        <li><strong>Data subjects:</strong> your team (admins, instructors), your students, and your storefront customers.</li>
        <li><strong>Personal data categories:</strong> names, email addresses, WhatsApp / phone numbers, country, course enrolments, attendance records, quiz attempts, assignment submissions, payment metadata (we do not store card numbers).</li>
        <li><strong>Special categories:</strong> we do not require sensitive categories. If you choose to upload them you confirm you have a lawful basis to do so.</li>
      </ul>

      <h2>4. Processor obligations</h2>
      <ul>
        <li>Process Personal Data only on your documented instructions, including transfers outside India where you so direct.</li>
        <li>Ensure persons authorised to process Personal Data are bound by confidentiality.</li>
        <li>Implement appropriate technical and organisational measures (see Annex A below).</li>
        <li>Assist you in fulfilling data-subject rights requests and conducting impact assessments.</li>
        <li>Notify you without undue delay (within 72 hours) of any Personal Data breach.</li>
        <li>Make available the information necessary to demonstrate compliance with this DPA.</li>
      </ul>

      <h2>5. Sub-processors</h2>
      <p>
        You authorise us to engage the sub-processors listed in our <a href="/legal/privacy">Privacy Policy</a>. We will notify you of any new or replacement sub-processor at least 30 days before they begin processing, and give you a reasonable opportunity to object on reasonable grounds.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Personal Data is hosted in India by default. Where data is transferred to recipients outside India, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission and, where applicable, the UK International Data Transfer Addendum.
      </p>

      <h2>7. Return &amp; deletion</h2>
      <p>
        On termination of your subscription, we provide a 30-day window to export your data. After that window we delete or anonymise Personal Data processed on your behalf, except where retention is required by law.
      </p>

      <h2>8. Liability</h2>
      <p>
        Our aggregate liability under this DPA is subject to the liability cap in the Terms of Service.
      </p>

      <h2>Annex A — Security measures</h2>
      <ul>
        <li>Encryption in transit (TLS 1.2+) for all client/server traffic.</li>
        <li>Encryption at rest for backups and database storage.</li>
        <li>Tenant isolation via per-workspace storage namespacing.</li>
        <li>Role-based access controls within our team; least-privilege production access.</li>
        <li>HMAC-signed stateless tokens for password reset and email verification.</li>
        <li>Audit logging for administrative actions.</li>
        <li>Annual review of sub-processors and security posture.</li>
      </ul>

      <h2>Annex B — Signing this DPA</h2>
      <p>
        For Starter and Growth plans this DPA is accepted automatically when you create a workspace and form part of our Terms of Service. For Scale customers we can co-sign a counter-signed copy on request — email <a href="mailto:hello@thebigclass.com">hello@thebigclass.com</a>.
      </p>
    </LegalShell>
  )
}
