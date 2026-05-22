"use client"

import jsPDF from "jspdf"
import { toPng } from "html-to-image"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { createElement } from "react"
import type { Certificate } from "./certificate-store"
import { CertificateFull } from "@/components/certificates/certificate-preview"
import { CustomTemplateRenderer } from "@/components/certificates/custom-template-renderer"
import { getCustomTemplate } from "./custom-templates"
import { readOrgSettings } from "./org-settings"

interface PDFOptions {
  certificate: Certificate
  organisation?: string
}

// A4 landscape at 4px/mm ≈ 144dpi.
const PX_W = 1188
const PX_H = 840

// Strategy:
// 1. Mount an on-screen host (NOT position:-10000 — that breaks html-to-image's
//    cloning on some browsers because computed bounds become unreliable).
//    Hide it visually with opacity:0 on a wrapper, but keep the inner snapshot
//    target at opacity:1 so its serialised SVG output isn't transparent.
// 2. flushSync the React render so the DOM is committed before snapshot.
// 3. Wait for fonts + an animation frame, then call toPng on the inner element.
// 4. Embed the PNG into a landscape-A4 jsPDF and save.
export async function generateCertificatePDF({ certificate }: PDFOptions): Promise<void> {
  const formattedDate = new Date(certificate.completionDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Outer wrapper: hidden from the user. Pointer/zIndex/opacity keep it
  // out of the way without removing it from layout.
  const wrapper = document.createElement("div")
  wrapper.style.position = "fixed"
  wrapper.style.top = "0"
  wrapper.style.left = "0"
  wrapper.style.opacity = "0"
  wrapper.style.pointerEvents = "none"
  wrapper.style.zIndex = "-2147483648"

  // Inner snapshot target: the actual A4 surface we hand to toPng.
  const target = document.createElement("div")
  target.style.width = `${PX_W}px`
  target.style.height = `${PX_H}px`
  target.style.background = "#ffffff"
  target.style.overflow = "hidden"
  target.style.position = "relative"
  // CSS override that neutralises CertificateFull's `aspect-[1.414/1] w-full
  // max-w-3xl mx-auto` outer wrapper so the cert fills the full A4 surface.
  const styleEl = document.createElement("style")
  styleEl.textContent = `
    .cert-snapshot-root > div {
      max-width: none !important;
      width: ${PX_W}px !important;
      height: ${PX_H}px !important;
      aspect-ratio: auto !important;
      margin: 0 !important;
    }
  `
  target.appendChild(styleEl)

  const reactMount = document.createElement("div")
  reactMount.className = "cert-snapshot-root"
  reactMount.style.width = `${PX_W}px`
  reactMount.style.height = `${PX_H}px`
  target.appendChild(reactMount)

  wrapper.appendChild(target)
  document.body.appendChild(wrapper)

  // If this cert was issued with a user-designed template, resolve the
  // layout from the custom-templates store and render that instead of
  // CertificateFull. Same snapshot pipeline; only the React tree differs.
  const customTpl =
    certificate.template === "custom" && certificate.customTemplateId
      ? getCustomTemplate(certificate.customTemplateId)
      : undefined

  const root = createRoot(reactMount)
  try {
    flushSync(() => {
      root.render(
        customTpl
          ? createElement(CustomTemplateRenderer, {
              template: customTpl,
              fields: {
                student_name: certificate.studentName,
                course_name: certificate.courseName,
                completion_date: formattedDate,
                instructor_name: certificate.instructorName,
                organisation_name: readOrgSettings().organisationName,
                certificate_id: certificate.id,
                grade: certificate.grade,
              },
              verificationUrl: `${window.location.origin}/verify/${certificate.id}`,
              fit: false,
            })
          : createElement(CertificateFull, {
              // certificate.template is widened by Certificate to include
              // "custom", but in this branch customTpl is undefined which
              // means the template is one of the built-ins.
              template: certificate.template as Exclude<Certificate["template"], "custom">,
              name: certificate.studentName,
              course: certificate.courseName,
              date: formattedDate,
              instructor: certificate.instructorName,
              certificateId: certificate.id,
            })
      )
    })

    // Force two animation frames so layout + paint definitely complete.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    if ("fonts" in document) {
      await (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready
    }
    await new Promise((r) => setTimeout(r, 120))

    const dataUrl = await toPng(target, {
      width: PX_W,
      height: PX_H,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
      // Inside the cloned SVG, ensure the target's own opacity is forced to 1
      // (its computed style is 1 in the live DOM anyway, but this guards
      // against any inherited transparency from the hidden wrapper).
      style: { opacity: "1", transform: "none" },
    })

    if (!dataUrl || dataUrl === "data:," || dataUrl.length < 1000) {
      throw new Error("Snapshot produced empty image — template may not have rendered in time.")
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210, undefined, "FAST")
    pdf.save(`${certificate.studentName.replace(/\s+/g, "_")}_Certificate.pdf`)
  } finally {
    root.unmount()
    wrapper.remove()
  }
}

export async function generateBatchPDF(certificates: Certificate[], organisation?: string): Promise<void> {
  for (let i = 0; i < certificates.length; i++) {
    await generateCertificatePDF({ certificate: certificates[i], organisation })
    if (i < certificates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}
