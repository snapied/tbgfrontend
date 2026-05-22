"use client"

// Bridge from the various stores (LMS courses, portal store) into the
// PortalDataset shape the section renderers expect. Centralised here so
// every public portal page doesn't reinvent the conversion + lead
// submission flow.
//
// Lead submission: writes to the dashboard inbox, fires an in-app
// notification for the workspace owner, sends an HTML notification
// email to the owner, AND a confirmation email to the submitter.

import { useCallback, useMemo } from "react"
import { useLMS, generateId, type Notification } from "@/lib/lms-store"
import {
  usePortal,
  generatePortalId,
  type PortalLead,
} from "@/lib/portal-store"
import { useStore } from "@/lib/store-store"
import { useTenant } from "@/lib/tenant-store"
import { useOrgSettings } from "@/lib/org-settings"
import { formatMoney as fmtMoney } from "@/lib/currency"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import type {
  PortalCourseLite,
  PortalDataset,
  PortalStoreProductLite,
} from "@/components/portal/section-renderer"

export function usePortalDataset(tenant: string): PortalDataset {
  const { courses, users, addNotifications } = useLMS()
  const { faculty, testimonials, posts, addLead, config } = usePortal()
  const { products } = useStore()
  const { currentTenant } = useTenant()
  const { settings } = useOrgSettings()

  const storeProductLites: PortalStoreProductLite[] = useMemo(
    () =>
      products
        .filter((p) => p.status === "published")
        .map((p) => {
          const pr = p.pricing
          const priceLabel =
            pr.type === "free"
              ? "Free"
              : pr.type === "one-time"
              ? fmtMoney(pr.amount, pr.currency)
              : pr.type === "subscription"
              ? `${fmtMoney(pr.amount, pr.currency)} / ${
                  pr.intervalDays === 30 ? "month" :
                  pr.intervalDays === 90 ? "quarter" :
                  pr.intervalDays === 180 ? "6 mo" : "year"
                }`
              : pr.type === "pay-what-you-want"
              ? `From ${fmtMoney(pr.minAmount, pr.currency)}`
              : "—"
          return {
            id: p.id,
            slug: p.slug,
            title: p.title,
            subtitle: p.subtitle,
            coverImageUrl: p.coverImageUrl,
            kind: p.kind,
            priceLabel,
          }
        }),
    [products],
  )

  const courseLites: PortalCourseLite[] = useMemo(
    () =>
      courses
        .filter((c) => c.status === "published")
        .map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          description: stripRichTextTags(c.description ?? "").slice(0, 240),
          thumbnail: c.thumbnail,
          category: c.category,
          level: c.level,
          rating: c.rating,
          reviewCount: c.reviewCount,
          enrolledCount: c.enrolledCount,
          price: c.price,
          originalPrice: c.originalPrice,
          currency: c.currency,
        })),
    [courses],
  )

  const submitLead = useCallback(
    async (payload: Omit<PortalLead, "id" | "status" | "createdAt">) => {
      const lead: PortalLead = {
        id: generatePortalId("lead"),
        status: "new",
        createdAt: new Date().toISOString(),
        ...payload,
      }
      addLead(lead)

      // ── In-app notification for the workspace owner / admins ─────
      // We notify the tenant owner first, then any other admins. Falls
      // back to the first instructor if no admins exist (rare).
      const ownerEmail = currentTenant?.ownerEmail?.toLowerCase()
      const recipients = users.filter((u) => {
        if (ownerEmail && u.email.toLowerCase() === ownerEmail) return true
        return u.role === "admin"
      })
      const finalRecipients =
        recipients.length > 0
          ? recipients
          : users.filter((u) => u.role === "instructor").slice(0, 1)

      if (finalRecipients.length > 0) {
        const now = new Date().toISOString()
        const inAppEntries: Notification[] = finalRecipients.map((u) => ({
          id: generateId("notif"),
          userId: u.id,
          channel: "in-app",
          type: "lead.received",
          title: `New lead: ${lead.name ?? lead.email}`,
          body: lead.message ? lead.message.slice(0, 160) : `${lead.email} reached out via your ${lead.formId} form.`,
          url: "/dashboard/portal/leads",
          createdAt: now,
          sentAt: now,
          status: "sent",
          meta: { leadId: lead.id, formId: lead.formId, pageSlug: lead.pageSlug },
        }))
        addNotifications(inAppEntries)
      }

      // ── Email to the teacher / workspace owner ───────────────────
      // Best-effort — if /api/email/send is unreachable or the backend
      // is in stub mode, the lead still sits in the inbox + in-app
      // notification tray so nothing is actually lost.
      const teacherEmail = currentTenant?.ownerEmail
      const siteName = config.brand.siteName ?? settings.organisationName ?? tenant
      if (teacherEmail) {
        try {
          await fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: teacherEmail,
              subject: `New lead from ${siteName}: ${lead.name ?? lead.email}`,
              replyTo: lead.email,
              html: renderTeacherEmail({
                lead,
                siteName,
                teacherName: currentTenant?.ownerName,
              }),
            }),
          })
        } catch {
          /* offline / stub — fine */
        }
      }

      // ── Confirmation email to the lead submitter ─────────────────
      if (lead.email) {
        try {
          await fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: lead.email,
              subject: `Thanks for reaching out to ${siteName}`,
              replyTo: teacherEmail,
              html: renderSubmitterEmail({
                lead,
                siteName,
                teacherName: currentTenant?.ownerName,
              }),
            }),
          })
        } catch {
          /* fine */
        }
      }
    },
    [
      addLead,
      addNotifications,
      users,
      currentTenant?.ownerEmail,
      currentTenant?.ownerName,
      config.brand.siteName,
      settings.organisationName,
      tenant,
    ],
  )

  return useMemo(
    () => ({
      courses: courseLites,
      faculty,
      testimonials,
      posts,
      storeProducts: storeProductLites,
      basePath: `/p/${tenant}`,
      formatMoney: (amount: number, currency?: string) =>
        fmtMoney(amount, currency || "USD"),
      submitLead,
    }),
    [courseLites, faculty, testimonials, posts, storeProductLites, tenant, submitLead],
  )
}

// ============================================================
// Email templates
// ============================================================

// Both templates use a single-column ~600 px wide layout so they
// render acceptably in Gmail / Outlook / Apple Mail without needing
// MJML or hand-rolled table layouts.

function renderTeacherEmail({
  lead,
  siteName,
  teacherName,
}: {
  lead: PortalLead
  siteName: string
  teacherName?: string
}): string {
  const sourceLine = `${lead.formId} form on ${lead.pageSlug || "/"}`
  return emailShell({
    title: "New lead",
    body: `
      <p style="margin:0 0 12px;font-size:15px;color:#1f2937">Hi ${escape(teacherName ?? "there")},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#1f2937">
        <strong>${escape(lead.name ?? lead.email)}</strong> reached out via your
        <strong>${escape(siteName)}</strong> site.
      </p>
      ${kvBlock([
        ["Name", lead.name],
        ["Email", lead.email],
        ["Phone", lead.phone],
        ["Source", sourceLine],
        ["Received", new Date(lead.createdAt).toLocaleString()],
      ])}
      ${
        lead.message
          ? `<div style="margin-top:18px;padding:14px 16px;border-left:3px solid #d4af37;background:#fafaf7;font-size:14px;color:#1f2937;white-space:pre-wrap">${escape(lead.message)}</div>`
          : ""
      }
      <p style="margin:24px 0 8px;font-size:13px;color:#6b7280">
        Reply to this email and it goes straight to ${escape(lead.email)}.
      </p>
    `,
    cta: { label: "Open in lead inbox", href: "/dashboard/portal/leads" },
    siteName,
  })
}

function renderSubmitterEmail({
  lead,
  siteName,
  teacherName,
}: {
  lead: PortalLead
  siteName: string
  teacherName?: string
}): string {
  return emailShell({
    title: `Thanks for getting in touch`,
    body: `
      <p style="margin:0 0 12px;font-size:15px;color:#1f2937">Hi ${escape(lead.name ?? "there")},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#1f2937">
        Thanks for reaching out to <strong>${escape(siteName)}</strong>. We got your message and
        ${escape(teacherName ?? "the team")} will get back to you within a business day.
      </p>
      ${
        lead.message
          ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280">Just so you have it, here's what you sent:</p>
             <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-size:14px;color:#1f2937;white-space:pre-wrap">${escape(lead.message)}</div>`
          : ""
      }
      <p style="margin:20px 0 0;font-size:13px;color:#6b7280">
        If you didn't fill out a form on ${escape(siteName)}, you can safely ignore this email.
      </p>
    `,
    siteName,
  })
}

function emailShell({
  title,
  body,
  cta,
  siteName,
}: {
  title: string
  body: string
  cta?: { label: string; href: string }
  siteName: string
}): string {
  return `
<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af">${escape(siteName)}</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#0a3024;font-weight:600">${escape(title)}</h1>
    </td></tr>
    <tr><td style="padding:24px 28px">${body}${
      cta
        ? `<p style="margin:24px 0 0;text-align:left">
            <a href="${escape(cta.href)}" style="display:inline-block;padding:10px 18px;background:#0a3024;color:#ffffff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">${escape(cta.label)}</a>
          </p>`
        : ""
    }</td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
      Sent automatically by ${escape(siteName)}. Powered by The Big Class.
    </td></tr>
  </table>
</body></html>`.trim()
}

function kvBlock(rows: Array<[string, string | undefined]>): string {
  const filtered = rows.filter(([, v]) => !!v && String(v).trim())
  if (filtered.length === 0) return ""
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:14px;color:#1f2937">
    ${filtered
      .map(
        ([k, v]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;width:90px;vertical-align:top">${escape(k)}</td>
        <td style="padding:6px 0;vertical-align:top">${escape(v!)}</td>
      </tr>`,
      )
      .join("")}
  </table>`
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
