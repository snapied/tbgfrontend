// /solutions/for-course-creators — the full course platform on your URL.

import type { Metadata } from "next"
import {
  Award,
  FileText,
  Globe2,
  GraduationCap,
  Layers,
  Trophy,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "For course creators — Full course platform on your URL · The Big Class",
  description:
    "Self-paced courses with modules, lessons, quizzes, and certificates — plus a real portal, real blog, real storefront. No commission, full export on every plan, INR + global checkout.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-course-creators" },
}

export default function ForCourseCreatorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For course creators"
          title={
            <>
              The full course platform.{" "}
              <span className="text-primary">Your URL, your terms.</span>
            </>
          }
          subtitle="Build proper courses — modules, lessons, embedded video, quizzes, certificates. Sell them on your own portal. Run cohort variations of the same course. No platform commission. Full export on every plan."
          outcomes={[
            {
              icon: <GraduationCap className="h-5 w-5" />,
              title: "Build courses with real depth",
              body: "Modules and lessons, embedded video, downloads, inline quizzes, certificates on completion. Not a video dump.",
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: "Run cohort variations of the same course",
              body: "Attach a course to a cohort, add a feed and live sessions, charge a premium for the live variant. Same content, two revenue lines.",
            },
            {
              icon: <Award className="h-5 w-5" />,
              title: "Issue certificates students share",
              body: "17 designed templates plus a drag-and-drop designer. Public verification at /verify. Bulk-issue from CSV.",
            },
          ]}
          featureMap={[
            { icon: <GraduationCap className="h-4 w-4" />, title: "Course builder", body: "Modules · lessons · video · downloads · quizzes · certificates.", href: "/features/courses" },
            { icon: <Trophy className="h-4 w-4" />, title: "Quizzes", body: "18 ready-to-fire templates (JEE Maths, NEET Bio, GMAT, K-12). Auto-grade.", href: "/features/quizzes" },
            { icon: <Award className="h-4 w-4" />, title: "Certificates", body: "17 templates + designer. Bulk CSV issue. Public verify page.", href: "/features/certificates" },
            { icon: <Globe2 className="h-4 w-4" />, title: "Public portal", body: "Sell your course on your own URL, with proper SEO.", href: "/features/portal" },
          ]}
          comparison={{
            alternativeName: "Teachable / Thinkific",
            rows: [
              {
                label: "Platform commission",
                us: "0% — Razorpay direct to your bank",
                them: "0–10% depending on tier; lowest tier limits products",
              },
              {
                label: "Live + cohort included",
                us: "LiveKit rooms + cohort feeds in every plan",
                them: "Zoom integration extra; cohorts typically Pro-only",
              },
              {
                label: "Custom domain + white-label",
                us: "Pro+ — your URL, no platform badge",
                them: "Pro+ in most cases, with platform branding in emails",
              },
            ],
          }}
          cta={{
            title: "Your course deserves a platform that grows with you.",
            body: "Free Starter for your first course. Pro+ unlocks custom domain, cohorts, white-label, and team seats.",
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void FileText
void Layers
void Video
