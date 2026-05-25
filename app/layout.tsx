import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display, Geist_Mono, Great_Vibes, Allura, Dancing_Script, Caveat, Sacramento, Pacifico, Cormorant_Garamond, Cinzel, EB_Garamond, Manrope, Outfit, Fraunces } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CertificateProvider } from '@/lib/certificate-store'
import { LMSProvider } from '@/lib/lms-store'
import { DocsProvider } from '@/lib/docs'
import { OrgSettingsProvider } from '@/lib/org-settings'
import { TenantProvider } from '@/lib/tenant-store'
import { StoreProvider } from '@/lib/store-store'
import { WallProvider } from '@/lib/wall-store'
import { ReferralProvider } from '@/lib/referral-store'
import { PortalProvider } from '@/lib/portal-store'
import { ConfirmProvider } from '@/lib/use-confirm'
import { PlanProvider } from '@/lib/use-plan'
import { Toaster } from '@/components/ui/sonner'
// GlobalBrandStyles is intentionally NOT mounted here. Tenant brand
// colors should ONLY scope to the customer portal (/p/[tenant]/*) via
// PortalThemeProvider — the teacher dashboard and the rest of the
// platform stay on the default theme so admin chrome doesn't suddenly
// repaint when a teacher picks a new brand color.
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair'
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: '--font-geist-mono'
});

// Cursive / signature fonts — exposed as CSS classes so the template editor's
// font picker can offer real handwriting / display options to designers.
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: '--font-great-vibes' });
const allura = Allura({ subsets: ["latin"], weight: "400", variable: '--font-allura' });
const dancingScript = Dancing_Script({ subsets: ["latin"], variable: '--font-dancing-script' });
const caveat = Caveat({ subsets: ["latin"], variable: '--font-caveat' });
const sacramento = Sacramento({ subsets: ["latin"], weight: "400", variable: '--font-sacramento' });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", variable: '--font-pacifico' });

// Display serifs already used by built-in templates — surface them in the
// editor too so user-designed templates can match the same look.
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: '--font-cormorant' });
const cinzel = Cinzel({ subsets: ["latin"], variable: '--font-cinzel' });
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: '--font-eb-garamond' });
const manrope = Manrope({ subsets: ["latin"], variable: '--font-manrope' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const fraunces = Fraunces({ subsets: ["latin"], variable: '--font-fraunces' });

const editorFontVars = [
  greatVibes.variable, allura.variable, dancingScript.variable, caveat.variable,
  sacramento.variable, pacifico.variable, cormorant.variable, cinzel.variable,
  ebGaramond.variable, manrope.variable, outfit.variable, fraunces.variable,
].join(' ');

// Platform-level <head>.
//
// Defaults to "The Big Class …" for any page that doesn't override
// metadata at the route level. Tenant portal pages mount their own
// <DynamicMeta /> from the /p/[tenant] layout so each tenant's tab
// title / share preview reads as their own brand, not the platform's.
// Open Graph + Twitter card metadata included so links shared in
// Slack / WhatsApp / Twitter / LinkedIn render a rich preview card
// instead of a bare URL.
const SITE_URL = 'https://thebigclass.com'
const PLATFORM_TITLE = 'The Big Class — Teach, sell, certify. All in one.'
const PLATFORM_DESCRIPTION =
  'The all-in-one workspace for teachers, schools, and creators — live classes, courses, a branded storefront, certificates, and a Wall of Love. Launch your teaching brand in minutes.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PLATFORM_TITLE,
    // Per-route exports can set just a string; this template wraps it
    // with our brand suffix so every page in the platform reads
    // "<page> · The Big Class".
    template: '%s · The Big Class',
  },
  description: PLATFORM_DESCRIPTION,
  applicationName: 'The Big Class',
  generator: 'v0.app',
  keywords: [
    'online teaching platform',
    'course platform',
    'live classes',
    'LMS',
    'learning management system',
    'certificate generator',
    'certificate maker',
    'teacher storefront',
    'sell online courses',
    'membership platform',
    'education software',
  ],
  authors: [{ name: 'The Big Class', url: SITE_URL }],
  creator: 'The Big Class',
  publisher: 'The Big Class',
  category: 'education',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    siteName: 'The Big Class',
    title: PLATFORM_TITLE,
    description: PLATFORM_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    images: [
      {
        url: '/icon.svg',
        width: 1200,
        height: 630,
        alt: 'The Big Class — teach, sell, certify',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PLATFORM_TITLE,
    description: PLATFORM_DESCRIPTION,
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  // Neutral white so the mobile browser chrome doesn't fight whichever
  // template (light cream, dark navy, etc.) the tenant has applied to
  // their portal. Was hard-coded to deep green (#0a3024) — the legacy
  // platform brand colour — which clashed with every template.
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${geistMono.variable} ${editorFontVars} bg-background scroll-smooth`}>
      <body className="font-sans antialiased min-h-screen" suppressHydrationWarning>
        {/* Skip-to-main link — visually hidden until focused via Tab,
            then anchors the keyboard user directly past the global
            header so they don't have to walk 20+ tab stops to reach
            page content. Every public page anchors `id="main-content"`
            on its `<main>`; layouts that ship their own chrome can
            reuse the same id. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-background focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to main content
        </a>
        <ConfirmProvider>
          <TenantProvider>
            <OrgSettingsProvider>
              <LMSProvider>
                <DocsProvider>
                <StoreProvider>
                  <CertificateProvider>
                    <WallProvider>
                      <ReferralProvider>
                        <PortalProvider>
                          <PlanProvider>
                            {children}
                          </PlanProvider>
                        </PortalProvider>
                      </ReferralProvider>
                    </WallProvider>
                  </CertificateProvider>
                </StoreProvider>
                </DocsProvider>
              </LMSProvider>
            </OrgSettingsProvider>
          </TenantProvider>
        </ConfirmProvider>
        <Toaster richColors closeButton position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
