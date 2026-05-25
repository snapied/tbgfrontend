// /solutions/for-instagram-creators — link-in-bio that earns.

import type { Metadata } from "next"
import {
  Globe2,
  Heart,
  IndianRupee,
  Layers,
  Mic,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "For Instagram creators — A link-in-bio that earns · The Big Class",
  description:
    "Link-tree was a stopgap. Your real link-in-bio is a portal at your URL that sells your cohorts, 1:1 sessions, digital products, and memberships — checkout in UPI, no commission.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-instagram-creators" },
}

export default function ForInstagramCreatorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Instagram creators"
          title={
            <>
              A link-in-bio{" "}
              <span className="text-primary">that actually earns.</span>
            </>
          }
          subtitle="Stop pointing your audience at a Linktree page that just lists URLs. Your link-in-bio should be your storefront — your cohorts, 1:1s, downloads, and membership all in one place, at your URL, with UPI + global checkout."
          outcomes={[
            {
              icon: <ShoppingBag className="h-5 w-5" />,
              title: "One bio link, every product",
              body: "Cohorts, 1:1 sessions, downloads, memberships — all on one page. Your audience never bounces to a third-party checkout.",
            },
            {
              icon: <Heart className="h-5 w-5" />,
              title: "Move closer to your real fans",
              body: "Memberships create the inner circle Instagram won't show you. Posts, lives, downloads — only for paying members.",
            },
            {
              icon: <IndianRupee className="h-5 w-5" />,
              title: "Get paid the way India pays",
              body: "UPI checkout via Razorpay. Cards + NetBanking + EMI for global audiences. INR pricing, no FX dance.",
            },
          ]}
          featureMap={[
            { icon: <Globe2 className="h-4 w-4" />, title: "Your portal at your URL", body: "Custom domain on Pro+. Or a free thebigclass.com subdomain on day one.", href: "/features/portal" },
            { icon: <Package className="h-4 w-4" />, title: "Digital downloads", body: "Sell presets, e-books, prompt libraries, design files — one-click delivery.", href: "/solutions/digital-products" },
            { icon: <Mic className="h-4 w-4" />, title: "1:1 sessions", body: "Coaching slots with booking-link delivery.", href: "/features/storefront" },
            { icon: <Users className="h-4 w-4" />, title: "Paid community", body: "Cohort feed with reactions, posts, leaderboard — your inner circle.", href: "/solutions/paid-communities" },
          ]}
          comparison={{
            alternativeName: "Linktree + Stripe + Patreon stack",
            rows: [
              {
                label: "Your audience lands at",
                us: "ananya.com — your URL, your brand",
                them: "linktr.ee/ananya — their URL, their brand",
              },
              {
                label: "Checkout currency",
                us: "INR with UPI + cards. No FX conversion.",
                them: "USD-first. Indian buyers pay FX + foreign-card fees.",
              },
              {
                label: "Payouts",
                us: "T+2 direct to your bank — Razorpay Route, your own account",
                them: "Patreon takes 8–12%; Linktree's Mighty Pro is separate",
              },
            ],
          }}
          cta={{
            title: "Your bio link is prime real estate. Use it.",
            body: "Free plan covers the first product and the first cohort. Custom domain on Pro+. White-label everywhere on every plan that includes it.",
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void Layers
