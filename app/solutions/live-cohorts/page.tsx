// /solutions/live-cohorts — time-boxed batches, zero seat fees.

import type { Metadata } from "next"
import {
  Calendar,
  FileText,
  Film,
  GraduationCap,
  Trophy,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Live cohorts — Time-boxed batches, zero seat fees · The Big Class",
  description:
    "Run cohort-based programs without paying per-seat for Zoom or per-transaction for a course platform. LiveKit rooms + cohort feed + recordings + leaderboard + AI study guides — all included.",
  alternates: { canonical: "https://thebigclass.com/solutions/live-cohorts" },
}

export default function LiveCohortsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Live cohorts"
          title={
            <>
              Cohort-based programs.{" "}
              <span className="text-primary">Without the seat-fee math.</span>
            </>
          }
          subtitle="Run time-boxed batches with weekly live sessions, a private member feed, recordings included, a leaderboard that keeps momentum, and AI-generated study guides after every class. Zero Zoom subscription. Zero per-transaction commission."
          outcomes={[
            {
              icon: <Calendar className="h-5 w-5" />,
              title: "Run the same cohort every 4–12 weeks",
              body: "Each batch is its own community, schedule, leaderboard, recordings. Reuse the curriculum, refresh the experience.",
            },
            {
              icon: <Video className="h-5 w-5" />,
              title: "Live without Zoom",
              body: "LiveKit-powered class rooms — multi-host, recordings, transcripts, auto-chapters. Included in every plan.",
            },
            {
              icon: <FileText className="h-5 w-5" />,
              title: "AI study guides after class",
              body: "Every recording can spawn an AI-drafted study guide doc with embedded chapters — published to that cohort only.",
            },
          ]}
          featureMap={[
            { icon: <Calendar className="h-4 w-4" />, title: "Cohort container", body: "Each batch has its own feed, leaderboard, schedule, recordings.", href: "/features/community" },
            { icon: <Video className="h-4 w-4" />, title: "Live classes", body: "LiveKit rooms · cloud recording · transcripts · auto-chapters.", href: "/features/live-classes" },
            { icon: <Trophy className="h-4 w-4" />, title: "Leaderboard", body: "Attendance + quiz + assignment points keep momentum high.", href: "/features/community" },
            { icon: <FileText className="h-4 w-4" />, title: "Docs + AI study guides", body: "Multiplayer editor with live embeds + per-class study notes.", href: "/features/docs" },
          ]}
          comparison={{
            alternativeName: "Zoom + Teachable + a separate community tool",
            rows: [
              {
                label: "Live class billing",
                us: "Included on every plan. Cloud recording too.",
                them: "Zoom Pro per-host fee + recording-to-cloud add-on",
              },
              {
                label: "Cohort feed",
                us: "Built in — same workspace as the class room and the LMS",
                them: "Separate tool (Circle, Mighty, Discord) — separate billing, separate roster",
              },
              {
                label: "Where your recordings live",
                us: "In the cohort, next to chapters + transcript + chat history",
                them: "On Zoom's cloud (with quota) or your manual drive folder",
              },
            ],
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void Film
void GraduationCap
void Users
