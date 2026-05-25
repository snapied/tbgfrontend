// /solutions/memberships — recurring access to a bundle.

import type { Metadata } from "next"
import {
  CreditCard,
  GraduationCap,
  Layers,
  Package,
  Repeat,
  Users,
  Wallet,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Memberships — Recurring access to a bundle · The Big Class",
  description:
    "Subscription-gated access to a bundle of your products — courses, downloads, community, live AMAs. Monthly · quarterly · half-yearly · yearly + trial periods. Razorpay-native, INR + global, zero commission.",
  alternates: { canonical: "https://thebigclass.com/solutions/memberships" },
}

export default function MembershipsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Memberships"
          title={
            <>
              Recurring access.{" "}
              <span className="text-primary">To everything you ship.</span>
            </>
          }
          subtitle="A membership product wraps a bundle of your existing products in a subscription. Members get gated access to courses + downloads + community + live AMAs on one recurring charge. Trial periods supported."
          outcomes={[
            {
              icon: <Repeat className="h-5 w-5" />,
              title: "Predictable recurring revenue",
              body: "Monthly, quarterly, half-yearly, or yearly billing. INR + cards + UPI. Razorpay handles the subscription lifecycle.",
            },
            {
              icon: <Layers className="h-5 w-5" />,
              title: "Wrap whatever you already sell",
              body: "Courses, downloads, community access, 1:1 quota — pick any combination as the included bundle.",
            },
            {
              icon: <Wallet className="h-5 w-5" />,
              title: "Trial periods + cancellations",
              body: "Optional trial days defer the first charge. Cancellations stop future renewals, never claw back past payments.",
            },
          ]}
          featureMap={[
            { icon: <Repeat className="h-4 w-4" />, title: "Subscription product type", body: "30/90/180/365 day intervals + trial days.", href: "/features/storefront" },
            { icon: <Package className="h-4 w-4" />, title: "Bundle composition", body: "Pick the included products — courses, downloads, community.", href: "/solutions/digital-products" },
            { icon: <Users className="h-4 w-4" />, title: "Member-only feed", body: "Subscription-gated cohort community for the paid inner circle.", href: "/solutions/paid-communities" },
            { icon: <CreditCard className="h-4 w-4" />, title: "Razorpay subscriptions", body: "Auto-renew, cancel, prorate — full subscription lifecycle.", href: "/help/payouts-gateway-fees" },
          ]}
          comparison={{
            alternativeName: "Patreon + Discord",
            rows: [
              {
                label: "Commission per renewal",
                us: "0% — flat platform subscription, not a percentage on each renewal",
                them: "8–12% take rate on every recurring payment",
              },
              {
                label: "What members get",
                us: "Courses + community + live + downloads — bundled in one membership",
                them: "Discord channel + posts; courses live somewhere else",
              },
              {
                label: "Member roster",
                us: "Yours. Exportable any day. Email + UPI ID + GST data.",
                them: "Patreon's table. Discord's. Two databases that don't talk.",
              },
            ],
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void GraduationCap
