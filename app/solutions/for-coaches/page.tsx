// /solutions/for-coaches — 1:1 sessions, group cohorts, content.

import type { Metadata } from "next"
import {
  Calendar,
  FileText,
  GraduationCap,
  IndianRupee,
  Mic,
  ShieldCheck,
  Trophy,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "For coaches — 1:1 sessions, group cohorts, content · The Big Class",
  description:
    "Sell 1:1 coaching slots, run group cohorts, and ship a content library — all on one workspace, your own URL, with direct UPI + global card payouts. Replace Calendly + Patreon + Teachable + your custom site.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-coaches" },
}

export default function ForCoachesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For coaches"
          title={
            <>
              1:1 sessions.{" "}
              <span className="text-primary">Group cohorts. Content. One URL.</span>
            </>
          }
          subtitle="Sell coaching slots, run cohorts, drip your content library — every revenue model in one workspace. No Calendly subscription. No Patreon cut. No separate course platform. Direct payouts, your bank, T+2."
          outcomes={[
            {
              icon: <Mic className="h-5 w-5" />,
              title: "Sell 1:1 slots without 5 tools",
              body: "Booking-link delivery on every 1:1 product. Set your slot length, your buffer, your availability — checkout is one click.",
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: "Scale into group cohorts",
              body: "Time-boxed batches with a private feed, weekly live sessions, recordings included. Higher LTV per coach hour.",
            },
            {
              icon: <FileText className="h-5 w-5" />,
              title: "Ship a content library on the side",
              body: "Docs, video courses, downloads — bundled into a membership or sold standalone. Compound earnings beyond your hours.",
            },
          ]}
          featureMap={[
            { icon: <Mic className="h-4 w-4" />, title: "1:1 sessions", body: "Booking-link product type, duration + buffer, your availability.", href: "/features/storefront" },
            { icon: <Calendar className="h-4 w-4" />, title: "Live cohorts", body: "Cohort feed + leaderboard + LiveKit class rooms + recordings.", href: "/solutions/live-cohorts" },
            { icon: <GraduationCap className="h-4 w-4" />, title: "Self-paced courses", body: "Modules, lessons, quizzes, certificates — for the content side.", href: "/features/courses" },
            { icon: <Trophy className="h-4 w-4" />, title: "Cohort leaderboard", body: "Attendance + quiz + assignment points keep momentum high.", href: "/features/community" },
          ]}
          comparison={{
            alternativeName: "Calendly + Patreon + Teachable + a custom site",
            rows: [
              {
                label: "Number of bills",
                us: "One workspace, one monthly bill",
                them: "Four subscriptions — and each one charges per seat or per transaction",
              },
              {
                label: "Client record",
                us: "Single member record across every product — 1:1, cohort, memberhsip",
                them: "Four databases that never reconcile; admin work compounds",
              },
              {
                label: "Commission on revenue",
                us: "Zero. Payouts settle direct to your bank.",
                them: "Patreon 8–12% · Teachable 0–10% · Calendly seat fees",
              },
            ],
          }}
          cta={{
            title: "Your coaching practice — one workspace, your URL.",
            body: "Free plan covers your first 1:1 product and your first cohort. Pro+ unlocks custom domain and white-label.",
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void IndianRupee
void ShieldCheck
void Video
