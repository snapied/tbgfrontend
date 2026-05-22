// Legal page presets — one-click create Privacy / Terms / Cookies /
// Refund pages with boilerplate the teacher can edit. Each preset
// produces a portal page (slug + title + first rich-text section)
// that's then editable in the standard page editor.
//
// The copy here is starter text, not legal advice. A footer note in
// the seeded content reminds the teacher to have a lawyer review it
// before going live with real students.

export interface LegalPagePreset {
  slug: string
  title: string
  description: string
  navLabel: string
  body: string  // initial rich-text HTML for the page's first section
}

const lastReviewedLine = `<p><em>Last reviewed: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.</em></p>`

const disclaimer = `<p><strong>Important:</strong> This is a starting template — replace the bracketed placeholders with your actual policies and have a lawyer review it before publishing to real students.</p>`

export const LEGAL_PRESETS: LegalPagePreset[] = [
  {
    slug: "/privacy",
    title: "Privacy Policy",
    navLabel: "Privacy",
    description: "How you handle student data — required in most jurisdictions.",
    body: `
${disclaimer}
<h2>Information we collect</h2>
<p>When you create an account or enroll in a course, we collect: your name, email, phone number (optional), and any profile details you share. When you complete lessons, we record your progress, attendance, and submission history.</p>
<h2>How we use it</h2>
<ul>
  <li>To deliver the course you signed up for.</li>
  <li>To send course-related notifications (new lessons, live sessions, certificate issuance).</li>
  <li>To improve our teaching — anonymized usage signals, never sold to third parties.</li>
</ul>
<h2>Who we share with</h2>
<p>We share data only with the payment processor (for purchases), the email provider (for transactional notifications), and the video host (when you watch lessons). We never sell your data.</p>
<h2>Your rights</h2>
<p>You can request a copy of your data, export your certificates, or delete your account at any time by emailing <a href="mailto:[YOUR-SUPPORT-EMAIL]">[YOUR-SUPPORT-EMAIL]</a>.</p>
<h2>Cookies</h2>
<p>We use first-party cookies to keep you logged in and remember your progress. See our <a href="/cookies">Cookie Policy</a> for the full list.</p>
<h2>Contact</h2>
<p>Questions? Email <a href="mailto:[YOUR-SUPPORT-EMAIL]">[YOUR-SUPPORT-EMAIL]</a>.</p>
${lastReviewedLine}
`.trim(),
  },
  {
    slug: "/terms",
    title: "Terms of Service",
    navLabel: "Terms",
    description: "The rules of engagement — what you and your students agree to.",
    body: `
${disclaimer}
<h2>Accepting these terms</h2>
<p>By creating an account or enrolling in a course, you agree to these terms. If you don't agree, please don't use the service.</p>
<h2>Your account</h2>
<ul>
  <li>You're responsible for keeping your login secure. Don't share it.</li>
  <li>You must be at least 13 years old (or whatever your jurisdiction sets as the minimum).</li>
  <li>You're responsible for the accuracy of information you provide.</li>
</ul>
<h2>Course content</h2>
<p>Course material is licensed to you for personal learning. You may not download, redistribute, or republish lessons, slides, or recordings without written permission.</p>
<h2>Refunds</h2>
<p>See our <a href="/refund">Refund Policy</a> for the details.</p>
<h2>Acceptable use</h2>
<p>Don't use the service to harass other students, spam discussions, attempt to break security, or impersonate anyone.</p>
<h2>Termination</h2>
<p>We may suspend or terminate accounts that violate these terms. You may close your account at any time.</p>
<h2>Disclaimer</h2>
<p>We provide the service "as is" and make no warranties about uptime, accuracy, or fitness for any particular purpose. Our liability is limited to the amount you paid in the last 12 months.</p>
<h2>Changes</h2>
<p>We may update these terms. We'll notify you of material changes by email.</p>
${lastReviewedLine}
`.trim(),
  },
  {
    slug: "/refund",
    title: "Refund Policy",
    navLabel: "Refund",
    description: "When students can get their money back.",
    body: `
${disclaimer}
<h2>7-day refund window</h2>
<p>You can request a full refund within 7 days of purchase, no questions asked, as long as you've consumed less than 25% of the course (lessons completed + videos watched).</p>
<h2>How to request a refund</h2>
<p>Email <a href="mailto:[YOUR-SUPPORT-EMAIL]">[YOUR-SUPPORT-EMAIL]</a> with your order ID and the course title. We process refunds within 5 business days to your original payment method.</p>
<h2>Exceptions</h2>
<ul>
  <li>Live cohort sessions: refunds only until the cohort starts.</li>
  <li>Downloadable resources: non-refundable once downloaded.</li>
  <li>Free courses: nothing to refund.</li>
</ul>
${lastReviewedLine}
`.trim(),
  },
  {
    slug: "/cookies",
    title: "Cookie Policy",
    navLabel: "Cookies",
    description: "Which cookies we use and what they do.",
    body: `
${disclaimer}
<h2>What's a cookie?</h2>
<p>A small piece of text your browser stores on our behalf to remember things between page loads.</p>
<h2>Cookies we use</h2>
<ul>
  <li><strong>Session cookie</strong> — keeps you logged in.</li>
  <li><strong>Preference cookies</strong> — remember your theme + language pick.</li>
  <li><strong>Analytics cookies</strong> — anonymized usage signals so we know which lessons need work.</li>
</ul>
<h2>Third-party cookies</h2>
<p>We don't run third-party ad cookies. The only external cookies come from our payment processor during checkout.</p>
<h2>Managing cookies</h2>
<p>Your browser settings let you block or delete cookies. Blocking our session cookie means you'll be logged out.</p>
${lastReviewedLine}
`.trim(),
  },
]
