"use client"

import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileSignature,
  FlaskConical,
  GraduationCap,
  IndianRupee,
  Layers,
  Link2,
  Lock,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
  Star,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Data ────────────────────────────────────────────────────────

const BEFORE_PROBLEMS = [
  {
    icon: Calculator,
    title: "Manual commission tracking",
    desc: "Kishor calculates Gaurav's pay on paper every month — tallying student fees, subtracting payment gateway charges, dividing the split. One mistake and trust breaks.",
  },
  {
    icon: Clock,
    title: "Late, inconsistent payouts",
    desc: "Gaurav doesn't know when he'll get paid. Some months it's the 10th, some months it's the 25th. He has to ask, which feels awkward.",
  },
  {
    icon: Eye,
    title: "Zero financial transparency",
    desc: "Gaurav can't see how many students paid, what the gateway cut was, or how his share was calculated. He trusts Kishor — but he shouldn't have to.",
  },
  {
    icon: MessageSquare,
    title: "Students share phone numbers freely",
    desc: "A parent shares their WhatsApp number with Gaurav in the class chat. Next month, Gaurav is tutoring them privately — and Kishor's academy loses the student.",
  },
  {
    icon: FileSignature,
    title: "No written agreement",
    desc: "The teaching arrangement is verbal. If Gaurav leaves, who owns the recorded lectures? Can he take the students? Nobody documented anything.",
  },
  {
    icon: Lock,
    title: "Student data is wide open",
    desc: "Gaurav can see every student's email, phone number, and parent contact. There's no way to restrict what a teacher can access.",
  },
]

const WALKTHROUGH_STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: "Kishor invites Gaurav as a teacher",
    subtitle: "Dashboard → Teachers → Add Teacher",
    desc: "Kishor opens the teacher wizard. He fills in Gaurav's name and email, assigns him to 'Class 11 Chemistry' and 'Class 12 Chemistry', and flips the commission toggle to 'Yes'.",
    mockup: "step1",
    detail: "The system checks the plan — Kishor is on Studio, which includes teacher commissions. A course-assignment multi-select lets him pick exactly which courses Gaurav will teach.",
  },
  {
    step: 2,
    icon: IndianRupee,
    title: "Sets different commission per course",
    subtitle: "Step 2 — one card per course, each with its own model",
    desc: "Instead of one flat rate for everything, Kishor sets different terms for each course: Class 11 gets a 70% revenue split, Class 12 gets ₹1,500 per class (10 classes contracted). Each course has its own live calculator.",
    mockup: "step2",
    detail: "The wizard shows one commission card per assigned course. Kishor picks 'Percentage Split' for Class 11 Chemistry (70/30) and 'Fixed Fee / Class' for Class 12 Chemistry (₹1,500 × 10 = ₹15,000 contract). A 'Copy to all' button handles the common case where all courses share the same rate. Later, Kishor adds a second batch of Class 12 — 'Batch 2 Apr-Jun' — at ₹2,000/class with 8 classes. Each engagement is tracked independently.",
  },
  {
    step: 3,
    icon: FileSignature,
    title: "Attaches a legal agreement",
    subtitle: "The contract auto-fills with the exact terms per course",
    desc: "Kishor selects the 'Standard Teaching Agreement' template. The system injects all per-course commission terms, assigned courses, payout schedule, and IP ownership clauses into the contract automatically.",
    mockup: "step3",
    detail: "The agreement lists every engagement: 'Class 11 Chemistry — 70% split' and 'Class 12 Chemistry — ₹1,500/class, 10 classes'. Plus: IP ownership (academy-owned), non-solicitation (12 months), student data privacy obligations, and payout schedule (monthly, 15th).",
  },
  {
    step: 4,
    icon: UserCheck,
    title: "Gaurav receives an email and onboards",
    subtitle: "One link → read agreement → sign → add bank details → done",
    desc: "Gaurav clicks the invitation link. He reads the agreement (with his exact per-course commission terms highlighted), digitally signs it, enters his bank account and PAN for payouts, and lands on his teacher dashboard.",
    mockup: "step4",
    detail: "The onboarding is gated: Gaurav cannot access the dashboard until he signs the agreement AND submits valid payout details. The signed agreement is stored as an immutable PDF snapshot.",
  },
  {
    step: 5,
    icon: Wallet,
    title: "Gaurav sees per-course earnings — transparently",
    subtitle: "My Earnings → per-course breakdown with independent progress",
    desc: "Gaurav's dashboard shows earnings broken down by course: Class 11 at 70% split, Class 12 at ₹1,500/class with 7/10 classes done, Batch 2 at ₹2,000/class with 3/8 done. Each has its own progress bar and contract value.",
    mockup: "step5",
    detail: "Student names are masked (R***l S.). Each engagement shows: model, rate, progress, and estimated earnings. The per-class contracts show 'Earned: ₹10,500 / Remaining: ₹4,500'. No hidden fees — the 'How your earnings are calculated' link explains gateway deductions.",
  },
  {
    step: 6,
    icon: Send,
    title: "Kishor sends payment links to parents",
    subtitle: "Course → ⋯ menu → Send Payment Link",
    desc: "Instead of asking parents to find the course online, Kishor sends a secure payment link directly via WhatsApp. The parent opens it, sees the course details and price, pays via Razorpay, and the student gets enrolled automatically.",
    mockup: "step6",
    detail: "The invite page shows: academy branding, course title, class count, fee breakdown, and Kishor's personal note ('Hi, this is the chemistry bootcamp we discussed'). After payment, the parent creates an account (or logs in), and the system maps the payment to the student. Kishor gets a notification: '₹5,000 received — Rahul enrolled in Class 12 Chemistry'. No manual enrollment needed.",
  },
  {
    step: 7,
    icon: Star,
    title: "Students rate Gaurav after each class",
    subtitle: "Automatic feedback popup → stars + tags + optional comment",
    desc: "After each completed class, students see a quick feedback popup: 5-star rating, positive tags (Helpful, Clear, Engaging), improvement tags, and an optional comment. Anonymous by default — students can opt in to share their name.",
    mockup: "step7",
    detail: "Kishor (admin) sees everything: full names, all ratings, raw comments, and a moderation queue. Gaurav (teacher) sees only: aggregate rating (after 5+ responses), published comments (admin-approved), strength tags, and improvement tags (only if 3+ students mention the same thing). No complaint wall — a controlled, supportive feedback view.",
  },
  {
    step: 8,
    icon: Shield,
    title: "Student data stays locked down",
    subtitle: "Masking + anti-bypass filter + proxy messaging",
    desc: "Gaurav sees 'R***l S.' instead of 'Rahul Sharma'. If a student types their phone number in the class chat, it's auto-redacted to '[contact info removed]'. All communication happens through the platform.",
    mockup: "step8",
    detail: "The anti-bypass filter catches emails, phone numbers, WhatsApp mentions, and obfuscation attempts like 'at gmail dot com'. If Gaurav triggers the filter 3+ times in a week, Kishor gets an alert.",
  },
]

const AFTER_BENEFITS = [
  { icon: CheckCircle2, text: "Per-course commission — different models and rates for each course independently" },
  { icon: CheckCircle2, text: "Multi-batch tracking — same course, multiple batches, separate progress bars" },
  { icon: CheckCircle2, text: "Four compensation models — percentage split, per-student fixed, per-class fixed, or fixed academy commission" },
  { icon: CheckCircle2, text: "Monthly payouts on the 15th — consistent, automatic" },
  { icon: CheckCircle2, text: "Full transparency — Gaurav sees per-course earnings with exact math" },
  { icon: CheckCircle2, text: "Payment links via WhatsApp — send a link, parent pays, student gets enrolled automatically" },
  { icon: CheckCircle2, text: "Student feedback after every class — ratings, tags, moderated comments" },
  { icon: CheckCircle2, text: "Signed legal agreement — IP, data, and non-compete covered" },
  { icon: CheckCircle2, text: "Student data masked + anti-bypass messaging — no private contact sharing" },
  { icon: CheckCircle2, text: "Immutable payout ledger — every rupee is auditable" },
]

const EDGE_CASES = [
  {
    q: "Gaurav teaches 3 courses with different rates — how?",
    a: "Each course gets its own commission card in the wizard. Class 11: 70% split. Class 12: ₹1,500/class. Batch 2 of Class 12: ₹2,000/class. Each is tracked independently with its own progress, calculator, and payout. 'Copy to all' handles the common case where rates are the same.",
  },
  {
    q: "Gaurav starts a second batch of the same course — how?",
    a: "On Gaurav's detail page, Kishor clicks 'Add Engagement' and selects the same course again with a batch label ('Batch 2 Apr-Jun'). It gets its own fee, class count, and progress bar — completely independent from Batch 1.",
  },
  {
    q: "A parent pays via WhatsApp link — how does enrollment work?",
    a: "Kishor sends a payment link from the course's ⋯ menu. The parent opens it on their phone, sees the course details and price, pays via Razorpay. After payment, the system asks the parent to create an account (or log in). Enrollment is created only after payment + identity are both confirmed. No manual step for Kishor.",
  },
  {
    q: "What if the parent forwards the payment link to someone else?",
    a: "Anyone can open and pay. But after payment, the identity mapping step flags a mismatch: 'Invite sent to parent@email.com but claimed by stranger@email.com.' Kishor sees the flag and can revoke if needed. The system never silently enrolls the wrong person.",
  },
  {
    q: "What if Kishor fires Gaurav mid-semester?",
    a: "Kishor picks 'hard' or 'graceful' termination. Pending payouts are honored. Content stays published under the academy. Active subscriptions stop generating Gaurav's commission on next renewal.",
  },
  {
    q: "What if Kishor changes the split from 70/30 to 60/40?",
    a: "New terms apply to future transactions only. Past earnings are locked at 70/30. Gaurav is notified and must re-sign an updated agreement. The change is per-course — Kishor can renegotiate one course without affecting others.",
  },
  {
    q: "What if a student gives Gaurav a 1-star review?",
    a: "The rating counts in Gaurav's aggregate. If there's a written comment, it enters a moderation queue — Kishor reviews it before Gaurav can see it. Abusive comments are auto-flagged and never shown to Gaurav. Feedback doesn't affect payouts — it's for quality improvement only.",
  },
  {
    q: "What if a student gets a refund after Gaurav was already paid?",
    a: "A clawback entry is created on Gaurav's ledger. The refunded amount is deducted from his next payout. He sees exactly why in his transaction log.",
  },
  {
    q: "What if Kishor runs a 50% discount coupon?",
    a: "The commission calculation uses the actual collected amount, not the full price. This protects Kishor from negative revenue. The coupon attribution (admin vs teacher referral) determines who bears the discount.",
  },
  {
    q: "What if Gaurav's bank KYC fails?",
    a: "Funds accrue in his cleared balance. He's notified to update his bank details. The money never expires.",
  },
]

// ── Components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      <Sparkles className="h-3 w-3" />
      {children}
    </div>
  )
}

function PersonaCard({
  name,
  role,
  emoji,
  traits,
  color,
}: {
  name: string
  role: string
  emoji: string
  traits: string[]
  color: string
}) {
  return (
    <Card className={cn("border-2", color)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{emoji}</span>
          <div>
            <p className="text-xl font-bold">{name}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {traits.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {t}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function MockupFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="flex-1 text-center text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  )
}

function WizardStep1Mockup() {
  return (
    <MockupFrame label="Dashboard → Teachers → Add Teacher">
      <div className="space-y-4">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
            Profile & Role
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">2</span>
            Commission Setup
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Full Name</p>
            <div className="rounded-md border bg-background px-3 py-2 text-sm">Gaurav Mehta</div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Email</p>
            <div className="rounded-md border bg-background px-3 py-2 text-sm">gaurav@email.com</div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Assigned Courses</p>
          <div className="flex gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Class 11 Chemistry</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Class 12 Chemistry</span>
          </div>
        </div>
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Enable Paid Engagement?</p>
              <p className="text-xs text-muted-foreground">Track commissions and automate payouts</p>
            </div>
            <div className="h-6 w-11 rounded-full bg-primary p-0.5">
              <div className="h-5 w-5 translate-x-5 rounded-full bg-white shadow" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <span className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Save & Continue →
          </span>
        </div>
      </div>
    </MockupFrame>
  )
}

function WizardStep2Mockup() {
  return (
    <MockupFrame label="Step 2 — Per-course commission cards">
      <div className="space-y-3">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <span className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Profile & Role
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
            Commission Setup
          </span>
        </div>

        {/* Course 1 — Percentage */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">1</span>
            <div>
              <p className="text-xs font-semibold">Class 11 Chemistry</p>
              <p className="text-[10px] text-muted-foreground">₹5,000</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">Percentage Split</span>
            <span className="font-semibold">70%</span>
            <span className="text-muted-foreground">teacher</span>
            <span className="font-semibold">30%</span>
            <span className="text-muted-foreground">academy</span>
          </div>
          <div className="text-[9px] text-muted-foreground">Student pays ₹5,000 → Gaurav gets ₹3,415</div>
        </div>

        {/* Course 2 — Per class */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">2</span>
            <div>
              <p className="text-xs font-semibold">Class 12 Chemistry</p>
              <p className="text-[10px] text-muted-foreground">₹8,000</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">Fixed Fee / Class</span>
            <span className="font-semibold">₹1,500</span>
            <span className="text-muted-foreground">× 10 classes</span>
          </div>
          <div className="text-[9px] text-muted-foreground">Contract value: ₹15,000</div>
        </div>

        {/* Batch 2 hint */}
        <div className="rounded border border-dashed p-2 text-center">
          <p className="text-[10px] text-muted-foreground">+ Add batch (same course, different terms)</p>
        </div>
      </div>
    </MockupFrame>
  )
}

function OnboardingMockup() {
  return (
    <MockupFrame label="onboard/invite-token → Agreement Signing">
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-bold">Welcome to Kishor&apos;s Chemistry Academy</p>
          <p className="text-xs text-muted-foreground">Please review and sign your teaching agreement</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4 max-h-36 overflow-hidden relative">
          <p className="text-xs font-semibold mb-2">TEACHING AGREEMENT</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Between: Kishor&apos;s Chemistry Academy (&ldquo;Academy&rdquo;) and Gaurav Mehta (&ldquo;Teacher&rdquo;)
          </p>
          <div className="mt-2 rounded border border-primary/30 bg-primary/5 p-2">
            <p className="text-[10px] font-semibold text-primary">COMPENSATION</p>
            <p className="text-[10px]">Model: Percentage Split — Your Share: 70%</p>
            <p className="text-[10px]">Payout Schedule: Monthly, 15th of each month</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-muted/80 to-transparent" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-primary bg-primary flex items-center justify-center">
            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-xs">I have read and agree to the terms above</span>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Signature</p>
          <div className="rounded border bg-background px-3 py-2 text-sm italic text-primary">Gaurav Mehta</div>
        </div>
      </div>
    </MockupFrame>
  )
}

function EarningsMockup() {
  return (
    <MockupFrame label="Dashboard → My Earnings (Gaurav's view)">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total Earned", amount: "₹1,24,500", color: "text-green-600" },
            { label: "Pending", amount: "₹12,400", color: "text-amber-600" },
            { label: "Cleared", amount: "₹8,200", color: "text-blue-600" },
            { label: "Paid Out", amount: "₹1,03,900", color: "text-primary" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border p-2 text-center">
              <p className={cn("text-sm font-bold", c.color)}>{c.amount}</p>
              <p className="text-[9px] text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-primary/5 p-3">
          <p className="text-xs font-semibold">My Terms</p>
          <div className="mt-1 grid grid-cols-3 gap-2 text-[10px]">
            <div><span className="text-muted-foreground">Model:</span> 70/30 Split</div>
            <div><span className="text-muted-foreground">Payout:</span> Monthly, 15th</div>
            <div><span className="text-muted-foreground">Agreement:</span> <span className="text-primary underline">Signed</span></div>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">Recent Transactions</p>
          <div className="rounded border divide-y text-[10px]">
            <div className="flex items-center justify-between px-3 py-2">
              <span>28 May</span>
              <span className="text-muted-foreground">R***l S.</span>
              <span>Class 12 Chem</span>
              <span>₹5,000</span>
              <span className="font-semibold text-primary">₹3,415</span>
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[8px] font-bold text-green-700">Cleared</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span>25 May</span>
              <span className="text-muted-foreground">A***l K.</span>
              <span>Class 11 Chem</span>
              <span>₹5,000</span>
              <span className="font-semibold text-primary">₹3,415</span>
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[8px] font-bold text-green-700">Cleared</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span>20 May</span>
              <span className="text-muted-foreground">P***a M.</span>
              <span>Class 12 Chem</span>
              <span>₹5,000</span>
              <span className="font-semibold text-primary">₹3,415</span>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">Paid</span>
            </div>
          </div>
        </div>
      </div>
    </MockupFrame>
  )
}

function MaskingMockup() {
  return (
    <MockupFrame label="Privacy: What Gaurav sees vs. what Kishor sees">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-center">Gaurav&apos;s view (Teacher)</p>
          <div className="rounded border bg-red-50 dark:bg-red-950/20 p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2"><EyeOff className="h-3 w-3 text-red-500" /> <span className="font-medium">R***l S.</span></div>
            <div className="flex items-center gap-2"><EyeOff className="h-3 w-3 text-red-500" /> <span>r***l@g***.com</span></div>
            <div className="flex items-center gap-2"><EyeOff className="h-3 w-3 text-red-500" /> <span>+91 *****3210</span></div>
          </div>
          <div className="rounded border bg-amber-50 dark:bg-amber-950/20 p-2">
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Auto-redacted message:</p>
            <p className="text-[10px]">&ldquo;Hi sir, my number is [contact info removed], please call me&rdquo;</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-center">Kishor&apos;s view (Admin)</p>
          <div className="rounded border bg-green-50 dark:bg-green-950/20 p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2"><Eye className="h-3 w-3 text-green-600" /> <span className="font-medium">Rahul Sharma</span></div>
            <div className="flex items-center gap-2"><Eye className="h-3 w-3 text-green-600" /> <span>rahul@gmail.com</span></div>
            <div className="flex items-center gap-2"><Eye className="h-3 w-3 text-green-600" /> <span>+91 98765 43210</span></div>
          </div>
          <div className="rounded border bg-green-50 dark:bg-green-950/20 p-2">
            <p className="text-[10px] font-semibold text-green-700 dark:text-green-400">Full audit trail:</p>
            <p className="text-[10px]">Redaction event logged — teacher attempted to collect contact info</p>
          </div>
        </div>
      </div>
    </MockupFrame>
  )
}

// Step-to-mockup mapping
function PaymentLinkMockup() {
  return (
    <MockupFrame label="WhatsApp → Payment Link Page (mobile)">
      <div className="space-y-3 max-w-[280px] mx-auto">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Kishor&apos;s Chemistry Academy</p>
          <p className="text-sm font-bold mt-1">You&apos;re invited to join:</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-3 text-center">
          <p className="text-sm font-semibold">Class 12 Chemistry</p>
          <p className="text-[10px] text-muted-foreground">12 classes &middot; 3 months</p>
        </div>
        <div className="rounded border bg-blue-50 dark:bg-blue-950/20 p-2">
          <p className="text-[10px] italic text-blue-700 dark:text-blue-300">&ldquo;Hi Rahul, this is the chemistry bootcamp we discussed. I&apos;ve applied the early-bird discount for you.&rdquo;</p>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Course fee</span><span>₹5,000</span></div>
          <div className="flex justify-between text-green-600"><span>Early-bird discount</span><span>-₹2,500</span></div>
          <hr className="border-border" />
          <div className="flex justify-between font-semibold"><span>Total</span><span>₹2,500</span></div>
        </div>
        <div className="rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground">
          Pay ₹2,500 →
        </div>
        <p className="text-[9px] text-center text-muted-foreground">🔒 Secure payment by Razorpay</p>
      </div>
    </MockupFrame>
  )
}

function FeedbackMockup() {
  return (
    <MockupFrame label="Student feedback popup (after class)">
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">How was your class?</p>
          <p className="text-sm font-semibold mt-1">Class 12 Chemistry — Session 7</p>
          <p className="text-[10px] text-muted-foreground">25 May 2026 &middot; Gaurav Mehta</p>
        </div>
        <div className="flex justify-center gap-1">
          {[1,2,3,4,5].map((s) => (
            <span key={s} className={cn("text-lg", s <= 4 ? "text-amber-400" : "text-muted-foreground/30")}>★</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {["Helpful", "Clear", "Engaging"].map((t) => (
            <span key={t} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{t}</span>
          ))}
          {["Punctual"].map((t) => (
            <span key={t} className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
          ))}
        </div>
        <div className="rounded border p-2">
          <p className="text-[10px] text-muted-foreground italic">Great explanation of organic reactions today!</p>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="h-3 w-3 rounded border" />
          Share my name with the teacher
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <span className="rounded border py-1 text-center text-[9px] text-muted-foreground">Skip</span>
          <span className="rounded border py-1 text-center text-[9px] text-muted-foreground">Later</span>
          <span className="rounded bg-primary py-1 text-center text-[9px] font-medium text-primary-foreground">Submit</span>
        </div>
      </div>
    </MockupFrame>
  )
}

function StepMockup({ id }: { id: string }) {
  switch (id) {
    case "step1": return <WizardStep1Mockup />
    case "step2": return <WizardStep2Mockup />
    case "step3": return <OnboardingMockup />
    case "step4": return <OnboardingMockup />
    case "step5": return <EarningsMockup />
    case "step6": return <PaymentLinkMockup />
    case "step7": return <FeedbackMockup />
    case "step8": return <MaskingMockup />
    default: return null
  }
}

// ── Page ────────────────────────────────────────────────────────

export default function KishorUseCasePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-background" />
          <div className="relative mx-auto max-w-5xl px-6 py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Real-world use case</SectionLabel>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                How Kishor runs his chemistry academy
                <span className="text-primary"> without a spreadsheet.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Kishor teaches chemistry in Jaipur. He hired Gaurav to handle two batches.
                Before The Big Class, commission tracking lived on paper, student data was wide open,
                and payouts happened &ldquo;whenever.&rdquo; Here&apos;s how the platform replaced all of that.
              </p>
            </div>
          </div>
        </section>

        {/* ── Meet the characters ───────────────────────────────── */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>The people</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">Meet Kishor & Gaurav</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <PersonaCard
                name="Kishor Rawat"
                role="Academy Owner — Admin"
                emoji="👨‍🔬"
                color="border-blue-200 dark:border-blue-800"
                traits={[
                  "Runs 'Kishor's Chemistry Academy' in Jaipur",
                  "Teaches Class 12 Chemistry himself",
                  "Has 120 students across 4 batches",
                  "Uses WhatsApp for everything — billing, announcements, homework",
                  "Manually tracks fees in a notebook",
                ]}
              />
              <PersonaCard
                name="Gaurav Mehta"
                role="Invited Teacher — Instructor"
                emoji="👨‍🏫"
                color="border-green-200 dark:border-green-800"
                traits={[
                  "Hired to teach Class 11 and Class 12 Chemistry",
                  "Agreed to a 70/30 split verbally",
                  "Doesn't know exactly how much he'll earn this month",
                  "Has access to all student phone numbers",
                  "No signed agreement — everything is trust-based",
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── The problem ───────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>The problem</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">
                What breaks when you do it <span className="text-red-500">manually</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Six real problems Kishor faces every month — and how they erode trust,
                leak students, and create financial risk.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BEFORE_PROBLEMS.map((p) => (
                <Card key={p.title} className="border-red-200/50 dark:border-red-800/30">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <p.icon className="h-4.5 w-4.5" />
                      </span>
                      <p className="text-sm font-bold">{p.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── The walkthrough ───────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <SectionLabel>Step-by-step walkthrough</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                How Kishor sets up Gaurav — <span className="text-primary">in 10 minutes</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                From invitation to first transparent payout. Follow every click.
              </p>
            </div>

            <div className="space-y-20">
              {WALKTHROUGH_STEPS.map((step, i) => (
                <div
                  key={step.step}
                  className={cn(
                    "grid items-center gap-8 lg:grid-cols-2",
                    i % 2 === 1 && "lg:[&>*:first-child]:order-2",
                  )}
                >
                  {/* Text side */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {step.step}
                      </span>
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {step.subtitle}
                    </p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="text-xs font-semibold text-primary mb-1">Under the hood</p>
                      <p className="text-sm text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>

                  {/* Mockup side */}
                  <div>
                    <StepMockup id={step.mockup} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── After — benefits summary ──────────────────────────── */}
        <section className="border-y border-border bg-green-50/50 dark:bg-green-950/10 py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>The result</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">
                What changes for Kishor & Gaurav
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {AFTER_BENEFITS.map((b, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-green-200 dark:border-green-800/40 bg-card p-4"
                >
                  <b.icon className="h-5 w-5 shrink-0 text-green-600" />
                  <p className="text-sm">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Edge cases ────────────────────────────────────────── */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>Edge cases handled</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">
                &ldquo;But what if…?&rdquo;
              </h2>
              <p className="mt-3 text-muted-foreground">
                Every scenario academy owners ask about — answered with a real system behavior.
              </p>
            </div>
            <div className="space-y-4">
              {EDGE_CASES.map((e, i) => (
                <div key={i} className="rounded-lg border p-5">
                  <p className="font-semibold text-sm">{e.q}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{e.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="border-t border-border bg-primary/5 py-20">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <FlaskConical className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Ready to run your academy like Kishor?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Teacher commissions, legal agreements, transparent payouts, and student privacy — all built in.
              Start on Starter for free, upgrade to Studio when you&apos;re ready to add paid teachers.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free — no card needed
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">
                  See pricing & plans
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
