"use client"

import { useState } from "react"
import Link from "next/link"
import { Download, Search, Filter, MoreHorizontal, Eye, RefreshCw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCertificateStore } from "@/lib/certificate-store"

export default function BatchHistoryPage() {
  const { batches } = useCertificateStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = batch.courseName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Batch History</h1>
        <p className="text-muted-foreground">View and manage your certificate batches</p>
      </div>

      {/* Public verification reminder — every certificate carries a
          /verify/<id> URL that anyone (recruiters, parents, employers)
          can hit without signing up. Surface it here so the creator
          knows they can paste verify links into their own emails / CRM. */}
      <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Public certificate verification</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every issued certificate has a public URL at{" "}
            <code className="rounded bg-muted px-1 text-[11px]">/verify/&lt;certificate-id&gt;</code>
            {" "}— recruiters, parents, and employers can confirm authenticity
            without signing up. Paste the link in your own emails, transcripts,
            or LinkedIn endorsements.
          </p>
        </div>
        <Link
          href="/verify"
          target="_blank"
          className="shrink-0 rounded-md border border-success/40 bg-background px-2.5 py-1 text-xs font-medium text-success hover:bg-success/10"
        >
          Try it →
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by course name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
          <CardDescription>{filteredBatches.length} batches found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Template</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Certificates</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created By</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/history/${batch.id}`} className="font-medium text-foreground hover:text-primary">
                        {batch.courseName}
                      </Link>
                    </td>
                    <td className="px-4 py-4 capitalize text-muted-foreground">{batch.template}</td>
                    <td className="px-4 py-4">
                      <span className="text-foreground">{batch.successCount}</span>
                      <span className="text-muted-foreground">/{batch.totalRows}</span>
                      {batch.failureCount > 0 && (
                        <span className="ml-1 text-destructive">({batch.failureCount} failed)</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          batch.status === "completed" && "bg-success/10 text-success",
                          batch.status === "processing" && "bg-accent/20 text-accent-foreground",
                          batch.status === "error" && "bg-destructive/10 text-destructive"
                        )}
                      >
                        {batch.status === "completed" && "Completed"}
                        {batch.status === "processing" && "Processing"}
                        {batch.status === "error" && "Error"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{batch.createdBy}</td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/history/${batch.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {batch.status === "completed" && (
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download ZIP
                            </DropdownMenuItem>
                          )}
                          {batch.status === "error" && (
                            <DropdownMenuItem>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry Batch
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredBatches.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No batches found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
