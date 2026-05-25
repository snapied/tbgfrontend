// /solutions/digital-products — PDFs, audio, video, ZIPs, license keys.

import type { Metadata } from "next"
import {
  Download,
  Gift,
  Globe2,
  IndianRupee,
  Key,
  Layers,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Digital products — PDFs, audio, ZIPs, license keys · The Big Class",
  description:
    "Sell downloads (PDFs, audio, video, ZIPs, design files), license keys (auto-issued from a pool), and bundles — all at INR + cards, pay-what-you-want supported, zero commission.",
  alternates: { canonical: "https://thebigclass.com/solutions/digital-products" },
}

export default function DigitalProductsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Digital products"
          title={
            <>
              Sell what you made.{" "}
              <span className="text-primary">Keep what you earn.</span>
            </>
          }
          subtitle="Downloads (PDFs, audio, video, ZIPs, design files), license keys auto-issued from a pool, bundles that combine any of the above at one price. Pay-what-you-want supported. INR + global cards. Zero commission."
          outcomes={[
            {
              icon: <Download className="h-5 w-5" />,
              title: "One-click delivery, no extra tool",
              body: "Upload the file, set the price, hit publish. Buyer gets the download link the moment payment clears.",
            },
            {
              icon: <Gift className="h-5 w-5" />,
              title: "Pay-what-you-want for the early supporters",
              body: "Set a minimum and a suggested amount. Let fans pay extra. Common bump = 2–3× the floor.",
            },
            {
              icon: <Key className="h-5 w-5" />,
              title: "License keys for software + templates",
              body: "Auto-issued from a pool you uploaded. One key per order, never reused.",
            },
          ]}
          featureMap={[
            { icon: <Package className="h-4 w-4" />, title: "Downloads", body: "PDF · audio · video · ZIP · any digital file.", href: "/features/storefront" },
            { icon: <Key className="h-4 w-4" />, title: "License keys", body: "Auto-issued from a pool. For Notion templates, Figma kits, software trials.", href: "/features/storefront" },
            { icon: <Layers className="h-4 w-4" />, title: "Bundles", body: "Compose multiple downloads + courses at one price.", href: "/features/storefront" },
            { icon: <ShoppingBag className="h-4 w-4" />, title: "Coupons + early-bird", body: "Percent/fixed codes, time-windowed, per-product targeting.", href: "/features/storefront" },
          ]}
          comparison={{
            alternativeName: "Gumroad",
            rows: [
              {
                label: "Commission per sale",
                us: "0% — Razorpay direct payouts at your gateway rate",
                them: "10% take rate on every sale (free plan)",
              },
              {
                label: "Storefront",
                us: "A real portal at your URL — store, courses, blog, community",
                them: "A single Gumroad product page; no portal, no community",
              },
              {
                label: "INR + UPI",
                us: "Native — UPI checkout, GST invoicing",
                them: "USD-first; Indian buyers pay FX + foreign-card fees",
              },
            ],
          }}
        />
      </main>
      <Footer />
    </div>
  )
}

void Globe2
void IndianRupee
void Wallet
