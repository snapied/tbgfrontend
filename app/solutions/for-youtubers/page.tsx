// /solutions/for-youtubers — convert subscribers into paying members.

import type { Metadata } from "next"
import {
  Calendar,
  FileText,
  Globe2,
  IndianRupee,
  Repeat,
  ShoppingBag,
  Sparkles,
  Users,
  Video,
  Wallet,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "For YouTubers — Convert subscribers into paying members · The Big Class",
  description:
    "Take your YouTube audience past AdSense. Sell cohorts, memberships, and digital products on your own URL — with zero platform commission, UPI + global cards, and a real community on the side.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-youtubers" },
}

export default function ForYouTubersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For YouTubers"
          title={
            <>
              Past AdSense.{" "}
              <span className="text-primary">Into a real business.</span>
            </>
          }
          subtitle="Your subscribers already trust you. Give them a paid product, a private cohort, or a membership — all on your own URL, with payouts straight to your bank. AdSense is the floor; this is the ceiling."
          outcomes={[
            {
              icon: <Users className="h-5 w-5" />,
              title: "Turn watch-time into recurring revenue",
              body: "Memberships gate exclusive videos, behind-the-scenes content, monthly Q&As. Recurring INR or USD, your call.",
            },
            {
              icon: <Calendar className="h-5 w-5" />,
              title: "Run live cohorts your audience will pay for",
              body: "Time-boxed batches with a feed, weekly live sessions, recordings included. No Zoom seat fees.",
            },
            {
              icon: <ShoppingBag className="h-5 w-5" />,
              title: "Sell what you already make",
              body: "Notion templates, sample packs, e-books, prompt libraries, presets — checkout in one click via UPI + cards.",
            },
          ]}
          featureMap={[
            { icon: <Globe2 className="h-4 w-4" />, title: "Your own URL", body: "ananya.com instead of youtube.com/@ananya. Custom domain on Pro+.", href: "/features/portal" },
            { icon: <Repeat className="h-4 w-4" />, title: "Memberships", body: "Recurring access to bundled videos + Q&A + downloads.", href: "/solutions/memberships" },
            { icon: <Video className="h-4 w-4" />, title: "Live cohorts", body: "LiveKit-powered classes with recordings + chapters + transcript.", href: "/features/live-classes" },
            { icon: <FileText className="h-4 w-4" />, title: "Knowledge hub", body: "Public docs at yourdomain.com/k — SEO traffic on top of YouTube.", href: "/features/docs" },
          ]}
          comparison={{
            alternativeName: "YouTube + AdSense alone",
            rows: [
              {
                label: "Revenue per viewer",
                us: "₹999–₹14,999 per cohort or membership — recurring",
                them: "₹0.10–₹0.40 per 1,000 views — one-time",
              },
              {
                label: "Audience ownership",
                us: "Your subscribers in your roster, exportable any day",
                them: "YouTube owns the relationship and the subscriber list",
              },
              {
                label: "Algorithm dependence",
                us: "Your URL ranks on its own SEO. Audience finds you directly.",
                them: "If YouTube changes the algorithm, your traffic changes overnight",
              },
            ],
          }}
          cta={{
            title: "Your channel built the audience. Your URL builds the business.",
            body: "Free Starter plan covers the first cohort and the first membership. Pro+ adds the custom domain when you're ready to leave the youtube.com URL behind.",
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void IndianRupee
void Sparkles
void Wallet
