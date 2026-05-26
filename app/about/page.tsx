"use client"

import Link from "next/link"
import {
  ArrowRight,
  Baby,
  Building2,
  ExternalLink,
  Heart,
  Lightbulb,
  MapPin,
  Mountain,
  Quote,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-background" />
          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Mountain className="h-3 w-3" />
              Built in Dehradun, in the foothills of the Himalayas
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              We build software for the people who taught us first.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              The Big Class is a product of <span className="font-semibold text-foreground">Divisocial Tech Solutions</span>. We make tools for teachers, coaches, schools and institutes — because the people who shape minds shouldn&apos;t have to stitch together seven SaaS subscriptions to do their job.
            </p>
            
            <div className="mt-12 overflow-hidden rounded-2xl border border-border shadow-2xl">
              <img 
                src="/images/about/hero.png" 
                alt="Tech workspace overlooking the Himalayas" 
                className="w-full h-auto object-cover max-h-[500px]"
              />
            </div>
          </div>
        </section>

        {/* Mission + values */}
        <section className="pb-16">
          <div className="mx-auto grid max-w-5xl gap-4 px-6 sm:grid-cols-3 lg:px-8">
            <ValueCard
              icon={<Target className="h-5 w-5" />}
              title="Make the best tool, not the most features."
              body="Every release we ship gets pressure-tested with real teachers in our network. If a feature confuses them in five minutes, it doesn't ship."
            />
            <ValueCard
              icon={<Heart className="h-5 w-5" />}
              title="Honesty over polish."
              body="No fake testimonials. No invented institution counts. The Wall of Love on our customers' sites is the only social proof we trust."
            />
            <ValueCard
              icon={<Zap className="h-5 w-5" />}
              title="Indian-priced, India-hosted, Mountain time."
              body="Default region is Mumbai. Prices are in rupees first. We answer support from IST hours like the educators we serve."
            />
          </div>
        </section>

        {/* Founder profile — Renu Rawat.
            The Big Class wasn't born in a SaaS deck. It was born on
            a Tuesday afternoon in a Dehradun courtyard, with a
            four-year-old asking why ants walk in lines. This section
            tells that story the way it actually happened. */}
        <section className="relative overflow-hidden border-y border-border bg-gradient-to-br from-secondary/40 via-background to-accent/[0.04] py-24">
          {/* Soft ambient blooms so the section reads warm rather than
              clinical — picks up the candle-lit feel of the photo. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-primary/[0.10] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-accent/[0.10] blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Heart className="h-3 w-3" />
              Meet the founder
            </div>

            {/* Magnetic headline — the line that earns the page.
                Two-clause structure, the second clause carrying the
                emotional pivot. */}
            <h2 className="mt-5 max-w-4xl font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              The first user of <span className="text-primary">thebigclass.com</span>{" "}
              is six years old.
              <br />
              <span className="text-foreground/70">
                He doesn&apos;t know it&apos;s a product.
              </span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              His mother,{" "}
              <span className="font-semibold text-foreground">Renu Rawat</span>, never
              set out to build software. She set out to teach her son. Then five other
              children showed up. Then a hundred mothers wrote in asking{" "}
              <em>&ldquo;how are you doing this?&rdquo;</em> The answer became this
              platform.
            </p>

            {/* Photo + Story columns */}
            <div className="mt-14 grid gap-12 lg:grid-cols-[5fr_7fr] lg:items-start">
              {/* PHOTO COLUMN */}
              <div className="space-y-5">
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-2xl"
                  />
                  {/* Image lives at /public/images/founders/renu-rawat.png.
                      Portrait aspect preserved so the hand-drawn
                      annotations in the source photo stay readable. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/founders/renu-rawat.png"
                    alt="Renu Rawat, founder of The Big Class, holding a teacup at home in Dehradun."
                    className="aspect-[3/4] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-border"
                  />
                  {/* Pinned annotation — top-left, slightly rotated.
                      Picks up the candid handwritten energy of the
                      original photo without trying to imitate it. */}
                  <div className="absolute -left-3 -top-4 max-w-[180px] -rotate-3 rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
                    <p className="font-serif text-xs italic leading-snug text-foreground/90">
                      &ldquo;Just being me.&rdquo;
                    </p>
                  </div>
                  {/* Pinned annotation — bottom-right, the other side
                      of the photo, so both feel hand-tacked-on. */}
                  <div className="absolute -bottom-4 -right-3 max-w-[200px] rotate-2 rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
                    <p className="font-serif text-sm italic leading-snug text-foreground/90">
                      &ldquo;Good tea, soft lights, happy heart.&rdquo;
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Renu, on the porch · Dehradun
                    </p>
                  </div>
                </div>

                {/* Identity card */}
                <Card className="border-primary/20 bg-card">
                  <CardContent className="space-y-3 p-5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Founder
                      </p>
                      <p className="font-serif text-2xl font-bold tracking-tight">
                        Renu Rawat
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Mother. Instructor. Builder. In that order.
                      </p>
                    </div>
                    <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Baby className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Homeschool parent to{" "}
                          <span className="font-medium text-foreground">Divit</span>, age 6
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>Dehradun, in the Himalayan foothills</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Writes at{" "}
                          <a
                            href="https://renurawat.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            renurawat.com
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* STORY COLUMN — scene-driven prose, longer form. */}
              <div className="space-y-7">
                {/* Pull-quote — the sentence we want on a fridge magnet.
                    Bigger, more deliberate than the prose around it. */}
                <blockquote className="relative rounded-2xl border-l-4 border-primary bg-card/70 p-7 shadow-sm">
                  <Quote className="absolute -top-3.5 left-5 h-8 w-8 rounded-full bg-card p-1.5 text-primary ring-1 ring-border" />
                  <p className="font-serif text-2xl leading-snug text-foreground sm:text-[1.7rem]">
                    &ldquo;I wasn&apos;t trying to be a founder. I was trying to be a good
                    mother who could also keep teaching.&rdquo;
                  </p>
                  <footer className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-block h-px w-8 bg-muted-foreground/40" />
                    Renu Rawat, founder
                  </footer>
                </blockquote>

                {/* Story prose. Short paragraphs. Sensory verbs.
                    Each beat ends on a specific image rather than an
                    abstract claim — so the reader carries a picture
                    forward, not a slogan. */}
                <div className="space-y-5 text-[15.5px] leading-[1.8] text-foreground/85">
                  <p className="font-serif text-lg italic text-foreground/80">
                    The first lesson was about ants.
                  </p>
                  <p>
                    A Tuesday afternoon in Dehradun. Sunlight slanting through the
                    courtyard. Four-year-old{" "} 
                    <span className="font-semibold text-foreground">Divit</span>&nbsp; at his
                    mother&apos;s elbow asking{" "}
                    <em>why do ants walk in lines?</em> — and Renu, who had been a
                    teacher long before she was a mother, reaching for an app, the next
                    one, the next one, and finding none of them built for this:{" "}
                    <strong>
                      one child, one mother, one cup of tea, one question that deserved
                      an honest answer.
                    </strong>
                  </p>
                  <p>
                    The class of one became a class of five when the homeschool
                    families on her street started dropping their kids off on
                    Saturdays. Five became eleven. Eleven became a Google Sheet, then a
                    WhatsApp group, then a Zoom link, then a Razorpay page, then a
                    Canva certificate Divit taped to the fridge — then a forwarded
                    email from a mother in Pune asking{" "}
                    <em>&ldquo;how are you doing this?&rdquo;</em>
                  </p>
                  <p>
                    She wasn&apos;t doing it well. She was doing it with{" "}
                    <strong>six apps and a prayer.</strong> Every platform she tried
                    was either built for a 200-seat corporate LMS, or designed to take
                    11% of every rupee a mother charged to teach her own subject.
                    Neither was built for her. Neither, she suspected, was built for
                    any of the women writing in.
                  </p>
                  <p>
                    So she sat down with her husband{" "}
                    <span className="font-semibold text-foreground">Dinesh</span> —
                    engineer, co-founder, the patient kind — and described the tool
                    she wished existed. He started building it that weekend. The
                    principle was small enough to fit on an index card:{" "}
                    <em>
                      if it works for a mother teaching five kids in her living room,
                      it will work for a coach with five thousand. Solve the smallest
                      case honestly and the big ones follow.
                    </em>
                  </p>
                  <p>
                    That index card became{" "}
                    <strong className="text-foreground">thebigclass.com</strong>. Every
                    line of the{" "}
                    <Link
                      href="/founder-bill-of-rights"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Founder Bill of Rights
                    </Link>{" "}
                    — zero commission, one-click export, lifetime deals honoured,
                    audience never sold — answers the question Renu still asks every
                    Monday morning:{" "}
                    <em>
                      &ldquo;Would I sign up for this if I were the mother on the other
                      side?&rdquo;
                    </em>
                  </p>
                </div>

                {/* Voice-of-Renu warmth block — picks up the photo's
                    handwritten annotations and pulls them into the
                    product principles. This is the bridge between the
                    person and the platform. */}
                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                    The three rules taped to Renu&apos;s desk
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="font-serif text-lg italic text-foreground/85">
                      &ldquo;Good tea.&rdquo;
                    </div>
                    <div className="font-serif text-lg italic text-foreground/85">
                      &ldquo;Soft lights.&rdquo;
                    </div>
                    <div className="font-serif text-lg italic text-foreground/85">
                      &ldquo;Happy heart.&rdquo;
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Also a fair short summary of how we want this platform to feel —
                    calm, warm, unfussed. We measure software the same way some
                    mothers measure days.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button asChild>
                    <a
                      href="https://renurawat.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Meet Renu at renurawat.com
                      <ExternalLink className="ml-1.5 h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/founder-bill-of-rights">
                      Read the Founder Bill of Rights
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Three "Firsts" strip — concrete anchors so the story
                isn't abstract. Each card is one specific, true fact a
                reader can carry away. */}
            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              <FirstCard
                photo="/images/founders/divit-rawat.png"
                icon={<Baby className="h-4 w-4" />}
                label="First student"
                value="Divit, age 6"
                detail="Asks why ants walk in lines. Once corrected the alphabet song."
                photoAlt="Divit Rawat, the first student of The Big Class"
              />
              <FirstCard
                photo="/features/courses.jpg"
                icon={<MapPin className="h-4 w-4" />}
                label="First classroom"
                value="A kitchen table in Dehradun"
                detail="Four homeschool families on the street joined the Saturday cohort first."
                photoAlt="A cozy study setup representing the kitchen table classroom"
              />
              <FirstCard
                photo="/people/sanjay.jpg"
                icon={<Sparkles className="h-4 w-4" />}
                label="First commitment"
                value="Stay a teacher's tool"
                detail="If it stops feeling like something Renu would use, we stop shipping it."
                photoAlt="A teacher at work"
              />
            </div>
          </div>
        </section>

        {/* Why we exist */}
        <section className="border-y border-border bg-card py-16">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why we exist.</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Most teaching tools were built for venture-funded course empires — and priced like it. The actual people teaching online classes today are coaches running a Saturday batch, school teachers running a weekend cohort, college lecturers running a department track, and corporate L&amp;D teams running compliance onboarding.
              </p>
              <p>
                None of those teachers want a 14-day &quot;trial&quot; that becomes a sales call. They want to be live this week, without a developer, without a logo redesign, without a procurement cycle. So we built that.
              </p>
              <p>
                Starter is free forever. Growth costs less than a tenth of what the global incumbents charge for the same set of features. Scale is the version with the contract and the SLA, for institutions that need them — not a gate keeping you out of the basics.
              </p>
            </div>
          </div>
        </section>

        {/* Company facts */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <Building2 className="h-5 w-5" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">Parent company</p>
                  </div>
                  <p className="mt-3 font-semibold">Divisocial Tech Solutions Pvt. Ltd.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Incorporated in India. The Big Class is our flagship product.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="h-5 w-5" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">Registered address</p>
                  </div>
                  <p className="mt-3 font-semibold">7-B Race Course Road</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dehradun, Uttarakhand 248001, India
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-5 w-5" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">What we ship</p>
                  </div>
                  <p className="mt-3 font-semibold">Live cohorts, courses, storefronts, certificates, community — under one login.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <Mountain className="h-5 w-5" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">Where we work</p>
                  </div>
                  <p className="mt-3 font-semibold">Remote-first across India, headquartered in Dehradun.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Want to teach with us?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Spin up a workspace in three minutes. Drop us a line at{" "}
              <a href="mailto:welcome@thebigclass.com" className="text-primary hover:underline">welcome@thebigclass.com</a> if you&apos;d like to talk first.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Launch your academy free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/use-cases">See use cases</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function ValueCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="mt-4 font-semibold leading-snug">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}

// "Firsts" strip — three concrete anchors below the founder story.
// Label is the eyebrow, value is the headline fact, detail is the
// one-line zoom-in that makes it specific (a child, a street, a rule).
function FirstCard({
  photo,
  photoAlt,
  icon,
  label,
  value,
  detail,
}: {
  photo?: string
  photoAlt?: string
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  // Sensible alt fallback derived from the card's own label so a card
  // without an explicit `photoAlt` still gets a non-empty alt — much
  // better for screen-reader users than the old "" default which
  // hid the image's meaning entirely.
  const resolvedAlt = photoAlt ?? `${label}: ${value}`
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Photo */}
      {photo && (
        <div className="relative h-52 overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={resolvedAlt}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient so the badge reads cleanly */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {/* Label badge pinned bottom-left over photo */}
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-primary backdrop-blur-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
              {icon}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white">{label}</p>
          </div>
        </div>
      )}
      {/* Text */}
      <div className="space-y-1.5 p-5">
        {!photo && (
          <div className="flex items-center gap-2 text-primary">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">{icon}</div>
            <p className="text-[10px] font-semibold uppercase tracking-widest">{label}</p>
          </div>
        )}
        <p className="font-serif text-xl font-bold leading-snug">{value}</p>
        <p className="text-sm italic leading-relaxed text-muted-foreground">&ldquo;{detail}&rdquo;</p>
      </div>
    </div>
  )
}
