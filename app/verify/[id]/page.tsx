"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, XCircle, Calendar, Building, User, FileText, ArrowLeft, Download, Loader2, Share2 } from "lucide-react"
import { ShareMenu } from "@/components/share/share-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CertificateFull } from "@/components/certificates/certificate-preview"
import { CustomTemplateRenderer } from "@/components/certificates/custom-template-renderer"
import { Logo } from "@/components/brand/logo"
import { generateCertificatePDF } from "@/lib/pdf-generator"
import { getCustomTemplate, type CustomTemplate } from "@/lib/custom-templates"

// Shape of the server response from /api/certificates/<id>.
interface ApiCertificate {
  id: string
  studentName: string
  email: string
  courseName: string
  completionDate: string
  grade?: string
  instructorName: string
  template: string
  customTemplateId?: string
  status: "active" | "revoked"
  batchId: string
  createdAt: string
}
interface ApiBrand {
  siteName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
}
interface ApiSuccess {
  ok: true
  certificate: ApiCertificate
  tenantSlug: string
  tenantName: string
  brand: ApiBrand
}
interface ApiFailure {
  ok: false
  error: string
}

export default function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [downloading, setDownloading] = useState(false)
  const [customTpl, setCustomTpl] = useState<CustomTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<ApiSuccess | ApiFailure | null>(null)

  // Server-backed lookup. The verify page is PUBLIC — anyone (LinkedIn
  // scraping bots, recruiters, students themselves) can resolve a cert
  // by id without authenticating. We fetch from /api/certificates which
  // scans every tenant's server blob; localStorage isn't involved so
  // an incognito visitor (or a browser that never edited this tenant)
  // gets the same answer the issuing browser would.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/certificates/${encodeURIComponent(id)}`, {
          cache: "no-store",
        })
        const json = (await res.json().catch(() => null)) as
          | ApiSuccess
          | ApiFailure
          | null
        if (cancelled) return
        if (json) setResult(json)
        else setResult({ ok: false, error: "not-found" })
      } catch {
        if (!cancelled) setResult({ ok: false, error: "not-found" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const storedCert = result?.ok ? result.certificate : null
  const certificate = result?.ok
    ? {
        id: result.certificate.id,
        studentName: result.certificate.studentName,
        courseName: result.certificate.courseName,
        completionDate: result.certificate.completionDate,
        organisation: result.tenantName,
        instructorName: result.certificate.instructorName,
        template: result.certificate.template,
        status: result.certificate.status,
      }
    : null

  // Custom-template certs still resolve their layout from this browser's
  // own template store (templates live separately). For the common case
  // (built-in templates), this branch is skipped.
  useEffect(() => {
    if (storedCert?.template === "custom" && storedCert.customTemplateId) {
      setCustomTpl(getCustomTemplate(storedCert.customTemplateId) ?? null)
    }
  }, [storedCert])

  const handleDownload = async () => {
    if (!storedCert) return
    setDownloading(true)
    try {
      await generateCertificatePDF({
        certificate: {
          id: storedCert.id,
          studentName: storedCert.studentName,
          email: storedCert.email,
          courseName: storedCert.courseName,
          completionDate: storedCert.completionDate,
          grade: storedCert.grade,
          instructorName: storedCert.instructorName,
          // PDF renderer accepts the same template strings as the
          // local store; the server returns it verbatim.
          template: storedCert.template as never,
          customTemplateId: storedCert.customTemplateId,
          status: storedCert.status,
          batchId: storedCert.batchId,
          createdAt: storedCert.createdAt,
        },
      })
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    }
    setDownloading(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <Button variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/verify">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to search
            </Link>
          </Button>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">Looking up certificate…</p>
              </CardContent>
            </Card>
          ) : !certificate ? (
            // Certificate Not Found
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Certificate Not Found</h1>
                <p className="mt-2 text-muted-foreground">
                  No certificate was found with the ID <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{id}</code>
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Please check the ID and try again, or contact the issuing organisation.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/verify">Try Another ID</Link>
                </Button>
              </CardContent>
            </Card>
          ) : certificate.status === "revoked" ? (
            // Certificate Revoked
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Certificate Revoked</h1>
                <p className="mt-2 text-muted-foreground">
                  This certificate has been revoked by the issuing organisation.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Certificate ID: <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{certificate.id}</code>
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/verify">Verify Another Certificate</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Certificate Valid
            <div className="space-y-6">
              <Card>
                <CardContent className="py-6">
                  {/* Verified Badge */}
                  <div className="mb-6 flex items-center justify-center gap-3 rounded-lg bg-success/10 py-4">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                    <span className="text-lg font-semibold text-success">Verified Certificate</span>
                  </div>

                  {/* Certificate Preview */}
                  <div className="mb-6 overflow-hidden rounded-lg border border-border shadow-sm">
                    {certificate.template === "custom" ? (
                      customTpl ? (
                        <CustomTemplateRenderer
                          template={customTpl}
                          fields={{
                            student_name: certificate.studentName,
                            course_name: certificate.courseName,
                            completion_date: new Date(certificate.completionDate).toLocaleDateString("en-US", {
                              year: "numeric", month: "long", day: "numeric",
                            }),
                            instructor_name: certificate.instructorName,
                            organisation_name: certificate.organisation,
                            certificate_id: certificate.id,
                            grade: storedCert?.grade,
                          }}
                          verificationUrl={typeof window !== "undefined" ? `${window.location.origin}/verify/${certificate.id}` : undefined}
                          fit
                        />
                      ) : (
                        <div className="p-12 text-center text-sm text-muted-foreground">
                          This certificate was issued with a custom template that's no longer available on this device.
                        </div>
                      )
                    ) : (
                      <CertificateFull
                        template={certificate.template as never}
                        name={certificate.studentName}
                        course={certificate.courseName}
                        date={new Date(certificate.completionDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        instructor={certificate.instructorName}
                        certificateId={certificate.id}
                        organisation={certificate.organisation}
                      />
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Completion Date</p>
                        <p className="font-medium text-foreground">
                          {new Date(certificate.completionDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Issuing Organisation</p>
                        <p className="font-medium text-foreground">{certificate.organisation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Instructor</p>
                        <p className="font-medium text-foreground">{certificate.instructorName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Certificate ID</p>
                        <p className="font-mono text-sm font-medium text-foreground">{certificate.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Button variant="outline" asChild>
                      <Link href="/verify">Verify Another</Link>
                    </Button>
                    <Button className="gap-2" onClick={handleDownload} disabled={downloading}>
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {downloading ? "Generating..." : "Download PDF"}
                    </Button>
                    {/* Share menu — drives the achievement back into
                        community feeds. The QR + WhatsApp routes are
                        especially useful for graduates posting
                        externally; the "Share to community" item
                        (inside ShareMenu) writes a post into the
                        student's home cohort with the cert URL. */}
                    <ShareMenu
                      artifact={{
                        kind: "certificate",
                        title: `I just earned my ${certificate.courseName} certificate 🎓`,
                        description: `Awarded ${new Date(certificate.completionDate).toLocaleDateString()}${storedCert?.grade ? ` · Grade: ${storedCert.grade}` : ""}`,
                        url:
                          typeof window !== "undefined"
                            ? `${window.location.origin}/verify/${certificate.id}`
                            : `/verify/${certificate.id}`,
                        source: certificate.instructorName,
                      }}
                      hideEmbed
                      trigger={
                        <Button variant="outline" className="gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} The Big Class. Professional certificates, made simple.</p>
      </footer>
    </div>
  )
}
