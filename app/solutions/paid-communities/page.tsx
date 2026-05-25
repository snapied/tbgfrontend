// /solutions/paid-communities — subscription-gated cohort feeds.

import type { Metadata } from "next"
import {
  Calendar,
  Heart,
  IndianRupee,
  MessageSquare,
  Repeat,
  Trophy,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Paid communities — Subscription-gated cohort feeds · The Big Class",
  description:
    "A real paid community: subscription gate, member feed with reactions and threading, live AMAs, leaderboard, doubts inbox. On your URL, in INR + global, zero commission.",
  alternates: { canonical: "https://thebigclass.com/solutions/paid-communities" },
}

export default function PaidCommunitiesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Paid communities"
          title={
            <>
              The community{" "}
              <span className="text-primary">that pays the bills.</span>
            </>
          }
          subtitle="A real paid community — recurring subscription, member feed with reactions, live AMAs, leaderboard, doubts inbox. On your URL. In INR + global cards. Zero commission on what you collect."
          outcomes={[
            {
              icon: <Repeat className="h-5 w-5" />,
              title: "Recurring revenue, gated content",
              body: "Memberships create a subscription wall around your community feed, live AMAs, and bundled downloads.",
            },
            {
              icon: <Heart className="h-5 w-5" />,
              title: "A real feed — not a Discord channel",
              body: "Threaded comments, @-mentions, reactions, file uploads, leaderboard, pinned posts. Built for paying members.",
            },
            {
              icon: <Video className="h-5 w-5" />,
              title: "Live + recordings included",
              body: "AMAs, office hours, monthly group calls — LiveKit rooms with recordings posted to the same feed.",
            },
          ]}
          featureMap={[
            { icon: <Users className="h-4 w-4" />, title: "Community feed", body: "Posts, threaded comments, reactions, @-mentions, leaderboard.", href: "/features/community" },
            { icon: <Repeat className="h-4 w-4" />, title: "Memberships", body: "Recurring access · monthly/quarterly/yearly + trials.", href: "/solutions/memberships" },
            { icon: <Video className="h-4 w-4" />, title: "Live sessions", body: "AMAs and office hours, recorded, posted to the feed.", href: "/features/live-classes" },
            { icon: <MessageSquare className="h-4 w-4" />, title: "Doubts inbox", body: "Pre-sale + post-sale Q&A, email + in-app delivery.", href: "/features/doubts" },
          ]}
          comparison={{
            alternativeName: "Discord + Patreon",
            rows: [
              {
                label: "Where your members live",
                us: "Your URL, in your brand, in your roster",
                them: "Discord's URL, Discord's brand — Patreon owns the billing",
              },
              {
                label: "Commission on subscription",
                us: "Zero. Razorpay direct payouts to your bank.",
                them: "Patreon 8–12% + Discord Server Boost for premium features",
              },
              {
                label: "Member roster ownership",
                us: "Exportable CSV/JSON any day — your data, your relationship",
                them: "Discord and Patreon both gate exports + own the contact",
              },
            ],
          }}
          cta={{
            title: "Your community deserves its own URL.",
            body: "Free plan covers the first 50 members and the first cohort. Pro+ adds custom domain + white-label.",
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void Calendar
void IndianRupee
void Trophy
