import type { Metadata } from "next"
import PortalLayoutClient from "./portal-layout-client"

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params
  
  // Since real brand data lives in localStorage (client-side only for this POC),
  // we derive a clean fallback name from the URL slug for SSR (which bots see).
  // e.g. "renus" -> "Renus"
  const fallbackName = tenant
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: {
      template: `%s · ${fallbackName}`,
      default: fallbackName,
    },
    description: `Welcome to the ${fallbackName} portal. Explore courses, classes, and content.`,
    openGraph: {
      title: {
        template: `%s · ${fallbackName}`,
        default: fallbackName,
      },
      description: `Welcome to the ${fallbackName} portal. Explore courses, classes, and content.`,
      siteName: fallbackName,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: {
        template: `%s · ${fallbackName}`,
        default: fallbackName,
      },
      description: `Welcome to the ${fallbackName} portal. Explore courses, classes, and content.`,
    }
  }
}

export default function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  return (
    <PortalLayoutClient params={params}>
      {children}
    </PortalLayoutClient>
  )
}
