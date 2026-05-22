import { PublishBar } from "@/components/dashboard/publish-bar"

// Every /dashboard/portal/* surface mutates the portal draft. The
// PublishBar lives here so the "you have unpublished changes" sticky
// renders on each of them without each page having to import it.

export default function PortalEditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      {/* Bottom padding so content isn't hidden behind the bar. */}
      <div className="h-24" aria-hidden />
      <PublishBar />
    </>
  )
}
