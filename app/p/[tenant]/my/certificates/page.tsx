"use client"

// Student certificates page. Lists every active certificate awarded
// to the signed-in student (matched on email, since cert records
// pre-date the student User row in some cases — invites store the
// email before the user exists). Each row downloads the PDF via the
// same generator the teacher / verify pages use.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Award,
  Building,
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  Search,
  User as UserIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useLMS } from "@/lib/lms-store"
import { useCertificateStore, type Certificate } from "@/lib/certificate-store"
import { generateCertificatePDF } from "@/lib/pdf-generator"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { toast } from "sonner"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

export default function MyCertificatesPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const { currentUser } = useLMS()
  const { batches } = useCertificateStore()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Match on email (case-insensitive). Certificates are issued before
  // the student necessarily has a User row — the issuer types the
  // email; the row materialises later. Status === "active" filters
  // out anything the issuer has revoked.
  const myCerts = useMemo<Certificate[]>(() => {
    if (!currentUser?.email) return []
    const email = currentUser.email.toLowerCase()
    return batches
      .flatMap((b) => b.certificates)
      .filter((c) => c.email.toLowerCase() === email && c.status === "active")
      .sort((a, b) => b.completionDate.localeCompare(a.completionDate))
  }, [batches, currentUser?.email])

  const visible = useMemo(
    () => fuzzySearch(myCerts, search, (c) => `${c.courseName} ${c.instructorName}`),
    [myCerts, search],
  )

  const download = async (cert: Certificate) => {
    setDownloadingId(cert.id)
    try {
      await generateCertificatePDF({ certificate: cert })
      toast.success("Downloaded.")
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[certificate download]", err)
      toast.error("Couldn't generate the PDF. Try again.")
    } finally {
      setDownloadingId(null)
    }
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your certificates.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {myCerts.length === 0
            ? "Certificates you've earned will show up here once your teacher issues them."
            : `${myCerts.length} certificate${myCerts.length === 1 ? "" : "s"} earned.`}
        </p>
      </div>

      {myCerts.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course or instructor…"
            className="pl-9"
          />
        </div>
      )}

      {myCerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No certificates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a course and your teacher can award one. The shareable verification link goes here too.
            </p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href={`/p/${slug}/my/courses`}>My courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No matches</p>
            <p className="mt-1 text-sm text-muted-foreground">Try clearing the search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((cert) => (
            <Card key={cert.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="line-clamp-1 font-serif text-base font-semibold">
                      {cert.courseName}
                    </p>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {cert.template === "custom" ? "Custom design" : cert.template}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(cert.completionDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {cert.instructorName}
                    </span>
                    {cert.grade && (
                      <span className="inline-flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        Grade {cert.grade}
                      </span>
                    )}
                    <span className="font-mono text-[10px]">{cert.id}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/verify/${cert.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View / Share
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => download(cert)}
                    disabled={downloadingId === cert.id}
                  >
                    {downloadingId === cert.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
