"use client"

// Social-proof strip: a horizontal marquee of testimonial cards, each with
// a real face, name, role, and a short quote. Two alternating rows scroll
// in opposite directions so the section is always in motion and never feels
// like a static wall of text. The animation is pure CSS (no JS / framer-motion).
//
// Placement in the homepage narrative: after the Founder Bill of Rights trust
// close and before the product/feature sections — buyers who believe the
// promises look for validation from peers before diving into feature depth.

import { Star } from "lucide-react"

interface Testimonial {
  photo: string
  name: string
  role: string
  quote: string
  stars?: number
}

const TESTIMONIALS_ROW_1: Testimonial[] = [
  {
    photo: "/people/teacher-1.jpg",
    name: "Priya Sharma",
    role: "Yoga & Wellness Coach, Mumbai",
    quote: "Moved 200 students from WhatsApp groups to a real academy in one weekend. The CSV import is a genuine superpower.",
    stars: 5,
  },
  {
    photo: "/people/student-1.jpg",
    name: "Aanya Rao",
    role: "UX Design Student, Bangalore",
    quote: "My teacher's portal feels completely custom-branded. I forget I'm on a platform at all — it's just her academy.",
    stars: 5,
  },
  {
    photo: "/people/teacher-2.jpg",
    name: "Vikram Mehta",
    role: "Product Management Trainer, Delhi",
    quote: "Zero commission means I actually keep what I earn. That alone saved me ₹80,000 vs my last platform in the first 3 months.",
    stars: 5,
  },
  {
    photo: "/people/student-3.jpg",
    name: "Sara Thomas",
    role: "IELTS Prep Student, Kochi",
    quote: "The WhatsApp reminders actually got me to show up for live classes. I haven't missed a session since joining.",
    stars: 5,
  },
  {
    photo: "/people/teacher-3.jpg",
    name: "Arjun Krishnan",
    role: "Illustration & Design Educator, Chennai",
    quote: "The certificate designer let me make something my students were excited to share on LinkedIn. That drove me 14 new signups organically.",
    stars: 5,
  },
  {
    photo: "/people/student-2.jpg",
    name: "Karan Bhatia",
    role: "Python Bootcamp Graduate, Pune",
    quote: "The leaderboard made the whole cohort more engaged. We were actually competing to finish assignments first.",
    stars: 5,
  },
]

const TESTIMONIALS_ROW_2: Testimonial[] = [
  {
    photo: "/people/student-4.jpg",
    name: "Ravi Iyer",
    role: "Math Tutor Parent, Hyderabad",
    quote: "My daughter's teacher set up the whole thing herself — no tech person needed. Now we get attendance reports and recordings every week.",
    stars: 5,
  },
  {
    photo: "/people/meena.jpg",
    name: "Meena Pillai",
    role: "Carnatic Music Gurukul, Trivandrum",
    quote: "We teach 40 students across 3 batches. The recurring class scheduling and attendance tracking replaced three separate spreadsheets.",
    stars: 5,
  },
  {
    photo: "/people/deepika.jpg",
    name: "Deepika Anand",
    role: "Digital Marketing Learner, Jaipur",
    quote: "I genuinely love the Wall of Love — seeing classmates celebrate milestones pushed me to ship my first freelance project.",
    stars: 5,
  },
  {
    photo: "/people/sanjay.jpg",
    name: "Sanjay Kapoor",
    role: "Finance & Investing Coach, Mumbai",
    quote: "The API lets me pull student progress into my custom dashboards. No other creator platform even has one — let alone free on every plan.",
    stars: 5,
  },
  {
    photo: "/people/tanya.jpg",
    name: "Tanya Gupta",
    role: "Spoken English Student, Lucknow",
    quote: "My teacher can post recordings, slides, and homework all in one place after class. I never lose track of what I missed.",
    stars: 5,
  },
  {
    photo: "/people/nikhil.jpg",
    name: "Nikhil Desai",
    role: "UPSC Prep Academy, Nagpur",
    quote: "The 30-day refund policy convinced me to try it. Three months later I haven't looked back — and I never had to use the refund.",
    stars: 5,
  },
]

export function TestimonialsStrip() {
  return (
    <section className="relative overflow-hidden py-20" aria-label="What educators are saying">
      {/* Gradient fade edges so the marquee disappears cleanly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent"
      />

      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Educators & students who switched
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Real people. Real results.
          </h2>
        </div>
      </div>

      {/* Row 1 — scrolls left */}
      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-[marquee_40s_linear_infinite] gap-4 pr-4">
          {[...TESTIMONIALS_ROW_1, ...TESTIMONIALS_ROW_1].map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </div>
      </div>

      {/* Row 2 — scrolls right (reverse) */}
      <div className="relative mt-4 flex overflow-x-hidden">
        <div className="flex animate-[marquee_50s_linear_infinite_reverse] gap-4 pr-4">
          {[...TESTIMONIALS_ROW_2, ...TESTIMONIALS_ROW_2].map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={t.photo}
          alt={t.name}
          className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{t.name}</p>
          <p className="truncate text-xs text-muted-foreground">{t.role}</p>
        </div>
      </div>
      {t.stars && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: t.stars }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
      )}
      <blockquote className="text-sm leading-relaxed text-foreground/80">
        "{t.quote}"
      </blockquote>
    </div>
  )
}
