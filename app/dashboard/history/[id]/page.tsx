"use client"

import { use, useState, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Search, CheckCircle2, AlertCircle, ExternalLink, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CertificateFull } from "@/components/certificates/certificate-preview"
import { CustomTemplateRenderer } from "@/components/certificates/custom-template-renderer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCertificateStore } from "@/lib/certificate-store"
import { generateCertificatePDF, generateBatchPDF } from "@/lib/pdf-generator"
import { getCustomTemplate } from "@/lib/custom-templates"
import { useOrgSettings } from "@/lib/org-settings"

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getBatch, revokeCertificate } = useCertificateStore()
  const { settings: orgSettings } = useOrgSettings()
  const [search, setSearch] = useState("")
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const certificateRef = useRef<HTMLDivElement>(null)

  const batch = getBatch(id)

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batch Not Found</h2>
        <p className="text-muted-foreground mb-4">The batch you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/dashboard/history">Go to History</Link>
        </Button>
      </div>
    )
  }

  const filteredCertificates = batch.certificates.filter(
    (cert) =>
      cert.studentName.toLowerCase().includes(search.toLowerCase()) ||
      cert.email.toLowerCase().includes(search.toLowerCase()) ||
      cert.id.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = batch.certificates.filter((c) => c.status === "active").length
  const revokedCount = batch.certificates.filter((c) => c.status === "revoked").length

  const handleDownload = async (certId: string) => {
    setDownloading(certId)
    
    const cert = batch.certificates.find(c => c.id === certId)
    if (!cert) {
      setDownloading(null)
      return
    }
    
    try {
      await generateCertificatePDF({ certificate: cert })
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    }
    
    setDownloading(null)
  }

  const handleDownloadAll = async () => {
    setDownloadingAll(true)
    const activeCerts = batch.certificates.filter(c => c.status === "active")
    
    try {
      await generateBatchPDF(activeCerts)
    } catch (error) {
      console.error("Failed to generate PDFs:", error)
    }
    
    setDownloadingAll(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{batch.courseName}</h1>
          <p className="text-muted-foreground">
            Batch {id} &bull; {batch.template.charAt(0).toUpperCase() + batch.template.slice(1)} template
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadAll} disabled={downloadingAll}>
            {downloadingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloadingAll ? "Downloading..." : "Download All PDFs"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.totalRows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" /> Revoked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revokedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>All certificates in this batch</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Certificate ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-4">
                      <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{cert.id}</code>
                    </td>
                    <td className="px-4 py-4 font-medium">{cert.studentName}</td>
                    <td className="px-4 py-4 text-muted-foreground">{cert.email}</td>
                    <td className="px-4 py-4 text-muted-foreground">{cert.completionDate}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          cert.status === "active" && "bg-success/10 text-success",
                          cert.status === "revoked" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {cert.status === "active" && <CheckCircle2 className="h-3 w-3" />}
                        {cert.status === "revoked" && <AlertCircle className="h-3 w-3" />}
                        {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {cert.status === "active" && (
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Certificate Preview - {cert.studentName}</DialogTitle>
                              </DialogHeader>
                              <div ref={certificateRef} className="overflow-hidden rounded-lg border border-border">
                                {batch.template === "custom" ? (() => {
                                  const customTpl = batch.customTemplateId ? getCustomTemplate(batch.customTemplateId) : undefined
                                  if (!customTpl) {
                                    return (
                                      <div className="p-12 text-center text-sm text-muted-foreground">
                                        Custom template not found on this device.
                                      </div>
                                    )
                                  }
                                  const formattedDate = new Date(cert.completionDate).toLocaleDateString("en-US", {
                                    year: "numeric", month: "long", day: "numeric",
                                  })
                                  return (
                                    <CustomTemplateRenderer
                                      template={customTpl}
                                      fields={{
                                        student_name: cert.studentName,
                                        course_name: batch.courseName,
                                        completion_date: formattedDate,
                                        instructor_name: cert.instructorName,
                                        organisation_name: orgSettings.organisationName,
                                        certificate_id: cert.id,
                                        grade: cert.grade,
                                      }}
                                      verificationUrl={typeof window !== "undefined" ? `${window.location.origin}/verify/${cert.id}` : undefined}
                                      fit
                                    />
                                  )
                                })() : (
                                <CertificateFull
                                  template={batch.template}
                                  name={cert.studentName}
                                  course={batch.courseName}
                                  date={new Date(cert.completionDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                  instructor={cert.instructorName}
                                  certificateId={cert.id}
                                />
                                )}
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" asChild>
                                  <Link href={`/verify/${cert.id}`} target="_blank">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Public Page
                                  </Link>
                                </Button>
                                <Button onClick={() => handleDownload(cert.id)} disabled={downloading === cert.id}>
                                  {downloading === cert.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                  )}
                                  {downloading === cert.id ? "Generating..." : "Download PDF"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/verify/${cert.id}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDownload(cert.id)}
                            disabled={downloading === cert.id}
                          >
                            {downloading === cert.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      {cert.status === "revoked" && (
                        <span className="text-xs text-muted-foreground">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredCertificates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No certificates found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
