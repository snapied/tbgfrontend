"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { isRichTextEmpty } from "@/components/editor/rich-text-content"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { TagsInput } from "@/components/course-editor/tags-input"
import { usePortal, generatePortalId, suggestHandle, type PortalBlogPost } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { cn } from "@/lib/utils"
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiBlogMeta } from "@/lib/ai-client"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { toast } from "sonner"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { useTenant } from "@/lib/tenant-store"
import { useVersionedDoc } from "@/lib/versioning"
import { VersionsSheet } from "@/components/ui/versions-sheet"
import { useReviewThread } from "@/lib/review-store"
import { ReviewPanel } from "@/components/ui/review-panel"
import { History, MessageSquare } from "lucide-react"

const BLOG_NEW_TOUR: TourStep[] = [
  {
    title: "Write a new blog post",
    body: "Title, body, cover image, tags, SEO metadata. Click 'Generate metadata' under SEO to autofill excerpt + tags + meta in one shot.",
    emoji: "✍️",
    placement: "center",
  },
  {
    target: "[data-tour='blog-body']",
    title: "WYSIWYG body",
    body: "Format text, drop in images, embed YouTube. Same editor used for course descriptions — output renders cleanly on the public /blog page.",
    emoji: "📝",
    placement: "right",
  },
  {
    target: "[data-tour='blog-seo']",
    title: "SEO & metadata",
    body: "Slug, meta title, meta description, JSON-LD. Click 'Generate metadata' for an AI-drafted set based on your title + body — only fills empty fields, never overwrites your work.",
    emoji: "🔎",
    placement: "left",
  },
  {
    target: "[data-tour='blog-submit']",
    title: "Publish or save draft",
    body: "Status toggle on the right column controls draft vs published. Hit Create Post — drafts stay private, published posts go live at /blog/<slug> immediately.",
    emoji: "🚀",
    placement: "left",
  },
]

const BLOG_EDIT_TOUR: TourStep[] = [
  {
    title: "Edit blog post",
    body: "All fields are editable except the original creation date. Changes save when you click Save.",
    emoji: "✏️",
    placement: "center",
  },
  {
    target: "[data-tour='blog-body']",
    title: "Body content",
    body: "Edit freely. The slug doesn't auto-change if you rename the title — keeps existing /blog/<slug> URLs working for anyone who bookmarked the post.",
    emoji: "📝",
    placement: "right",
  },
  {
    target: "[data-tour='blog-seo']",
    title: "Update SEO",
    body: "Refresh meta whenever the body changes. 'Generate metadata' is non-destructive — already-filled fields stay as you wrote them.",
    emoji: "🔎",
    placement: "left",
  },
  {
    target: "[data-tour='blog-submit']",
    title: "Save changes",
    body: "Flips a draft into published or vice versa via the status toggle in the right column.",
    emoji: "💾",
    placement: "left",
  },
]

interface BlogEditorProps {
  postId?: string // If absent, creating a new post
}

export function BlogEditor({ postId }: BlogEditorProps) {
  const router = useRouter()
  const { posts, upsertPost, deletePost } = usePortal()
  const { currentUser } = useLMS()
  const { currentTenant } = useTenant()

  // Versioned-doc binding. Snapshots auto-trim past 50 entries; we
  // capture on every successful publish below + offer manual "Save a
  // version" from the sheet.
  const versions = useVersionedDoc<PortalBlogPost>({
    tenantSlug: currentTenant?.slug ?? "default",
    kind: "blog-post",
    artifactId: postId ?? "draft",
    actor: { id: currentUser?.id, name: currentUser?.name },
    isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })
  const [versionsOpen, setVersionsOpen] = useState(false)

  // Reviews bound to this post. New posts (no id yet) get a transient
  // "draft" thread that collapses when the post is created; in practice
  // teachers add review notes once a draft exists so this is a minor
  // edge case.
  const reviews = useReviewThread({
    tenantSlug: currentTenant?.slug ?? "default",
    kind: "blog-post",
    artifactId: postId ?? "draft",
    actor: { id: currentUser?.id, name: currentUser?.name },
  })
  const [reviewsOpen, setReviewsOpen] = useState(false)

  const existing = postId ? posts.find((p) => p.id === postId) : undefined
  const isNew = !existing

  const [title, setTitle] = useState(existing?.title ?? "")
  const [slug, setSlug] = useState(existing?.slug ?? "")
  const [excerpt, setExcerpt] = useState(existing?.excerpt ?? "")
  const [cover, setCover] = useState(existing?.coverImage ?? "")
  const [body, setBody] = useState(existing?.body ?? "")
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [categories, setCategories] = useState<string[]>(existing?.categories ?? [])
  const [status, setStatus] = useState<PortalBlogPost["status"]>(existing?.status ?? "draft")
  const [seoTitle, setSeoTitle] = useState(existing?.seo?.title ?? "")
  const [seoDesc, setSeoDesc] = useState(existing?.seo?.description ?? "")
  const [jsonLd, setJsonLd] = useState(existing?.seo?.jsonLd ?? "")
  const [noindex, setNoindex] = useState(existing?.seo?.noindex ?? false)
  
  const [allowComments, setAllowComments] = useState(existing?.allowComments ?? true)
  const [allowLikes, setAllowLikes] = useState(existing?.allowLikes ?? true)
  const [allowSharing, setAllowSharing] = useState(existing?.allowSharing ?? true)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const clearError = (field: string) => setErrors((e) => (e[field] ? { ...e, [field]: "" } : e))

  const finalSlug = (slug || suggestHandle(title || "post")).toLowerCase()
  const existingSlugs = posts.filter((p) => p.id !== existing?.id).map((p) => p.slug)
  const slugClash = existingSlugs.includes(finalSlug)

  const dirty = !!title.trim() || !isRichTextEmpty(body) || !!slug.trim() || !!excerpt.trim() || !!cover.trim() || tags.length > 0 || categories.length > 0
  const [submitting, setSubmitting] = useState(false)
  const { confirmLeave } = useUnsavedChangesGuard(dirty && !submitting)

  const goBack = (href: string) => {
    if (confirmLeave()) router.push(href)
  }

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = "Post title is required."
    if (!finalSlug) nextErrors.slug = "URL slug is required."
    if (slugClash) nextErrors.slug = "This URL slug is already taken. It must be unique."
    if (isRichTextEmpty(body)) nextErrors.body = "Add content to your blog post."
    
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      const firstField = ["title", "slug", "body"].find((f) => nextErrors[f])
      if (firstField && typeof document !== "undefined") {
        const el = document.getElementById(firstField)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus()
          else el.querySelector<HTMLElement>("input,button,[contenteditable]")?.focus()
        }
      }
      return
    }

    if (!currentUser) return
    setErrors({})
    setSubmitting(true)
    
    // Yield frame to render spinner
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const now = new Date().toISOString()
    const post: PortalBlogPost = {
      id: existing?.id ?? generatePortalId("post"),
      slug: finalSlug,
      title: title.trim(),
      excerpt: excerpt.trim() || undefined,
      coverImage: cover.trim() || undefined,
      body,
      authorId: existing?.authorId ?? currentUser.id,
      tags: tags.length > 0 ? tags : undefined,
      categories: categories.length > 0 ? categories : undefined,
      allowComments,
      allowLikes,
      allowSharing,
      status,
      publishedAt: status === "published" ? (existing?.publishedAt ?? now) : existing?.publishedAt,
      seo: {
        title: seoTitle.trim() || undefined,
        description: seoDesc.trim() || undefined,
        jsonLd: jsonLd.trim() || undefined,
        noindex: noindex ? true : undefined,
      },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    
    upsertPost(post)
    // Capture a version every time the post is saved so a wrong
    // edit can be undone. Auto-labelled so the user knows whether
    // it was a publish or a draft save.
    versions.snapshot(
      post,
      post.status === "published" ? "Published" : "Saved as draft",
    )
    router.push("/dashboard/portal/blog")
  }

  const handleDelete = () => {
    if (!existing) return
    if (confirm(`Delete "${existing.title}"?`)) {
      deletePost(existing.id)
      router.push("/dashboard/portal/blog")
    }
  }

  // Derive all unique categories from existing posts for autocomplete suggestions
  const allCategories = Array.from(new Set(posts.flatMap(p => p.categories || [])))
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])))

  return (
    <div className="space-y-6">
      <ProductTour
        tourId={isNew ? "blog-new-v1" : "blog-edit-v1"}
        steps={isNew ? BLOG_NEW_TOUR : BLOG_EDIT_TOUR}
      />
      {/* Header matching New Course */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => goBack("/dashboard/portal/blog")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isNew ? "Create New Blog Post" : "Edit Blog Post"}
            </h1>
            <p className="text-muted-foreground">Fill in the details to publish your article</p>
          </div>
        </div>
        <div className="flex gap-3">
          <TakeATourButton tourId={isNew ? "blog-new-v1" : "blog-edit-v1"} />
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => setVersionsOpen(true)}
              className="gap-1.5"
            >
              <History className="h-4 w-4" />
              Versions
              {versions.history.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                  {versions.history.length}
                </span>
              )}
            </Button>
          )}
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => setReviewsOpen(true)}
              className="gap-1.5"
            >
              <MessageSquare className="h-4 w-4" />
              Reviews
              {reviews.openCount > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                  {reviews.openCount}
                </span>
              )}
            </Button>
          )}
          {!isNew && (
            <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => goBack("/dashboard/portal/blog")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} data-tour="blog-submit">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? "Create Post" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set up your blog post details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Post Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., How to build a successful course"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); clearError("title") }}
                  aria-invalid={!!errors.title || undefined}
                  className={cn(errors.title && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Input
                  id="excerpt"
                  placeholder="One-line teaser — shown on cards and in blog indexes"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  maxLength={200}
                />
                <p className="text-[11px] text-muted-foreground">
                  Keep it concise. This is what convinces someone to read the full post.
                </p>
              </div>
              <div className="space-y-2" id="body" data-tour="blog-body">
                <Label>Content *</Label>
                <RichTextEditor
                  value={body}
                  onChange={(html) => { setBody(html); clearError("body") }}
                  placeholder="Start writing your amazing blog post here..."
                  minHeight={500}
                  error={!!errors.body}
                  folder="blog"
                />
                {errors.body ? (
                  <p className="text-xs text-destructive">{errors.body}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Formatting, links, images, and embeds are all supported.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-tour="blog-seo">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>SEO & Meta</CardTitle>
                  <CardDescription>Optimize your post for search engines like Google</CardDescription>
                </div>
                {/* Single AI button that fills excerpt + tags +
                    meta title + meta description from the current
                    title and body. One API call, four fields filled —
                    saves the teacher from doing the SEO work themselves. */}
                <AIGenerateButton
                  size="xs"
                  label="Generate metadata"
                  disabled={!title.trim()}
                  onGenerate={async () => {
                    const r = await aiBlogMeta({
                      title,
                      body: isRichTextEmpty(body) ? undefined : stripRichTextTags(body).slice(0, 1500),
                    })
                    if ("error" in r) {
                      toast.error(`Couldn't generate: ${r.error}`)
                      return
                    }
                    if (r.subtitle && !excerpt.trim()) setExcerpt(r.subtitle)
                    if (Array.isArray(r.tags) && r.tags.length > 0 && tags.length === 0) setTags(r.tags)
                    if (r.seoTitle && !seoTitle.trim()) setSeoTitle(r.seoTitle)
                    if (r.seoDescription && !seoDesc.trim()) setSeoDesc(r.seoDescription)
                    toast.success("Metadata drafted — only empty fields were filled, edit as needed.")
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">URL slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); clearError("slug") }}
                  placeholder={suggestHandle(title || "your-post")}
                  className={cn("font-mono text-sm", errors.slug && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.slug ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {errors.slug}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Public URL: <code>/blog/{finalSlug}</code>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Meta Title (optional)</Label>
                <Input 
                  id="seoTitle" 
                  value={seoTitle} 
                  onChange={(e) => setSeoTitle(e.target.value)} 
                  placeholder="Override the default <title> tag" 
                  maxLength={70} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDesc">Meta Description (optional)</Label>
                <Textarea 
                  id="seoDesc" 
                  value={seoDesc} 
                  onChange={(e) => setSeoDesc(e.target.value)} 
                  placeholder="Override the <meta name='description'>" 
                  maxLength={170} 
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jsonLd">JSON+LD Schema (optional)</Label>
                <Textarea 
                  id="jsonLd" 
                  value={jsonLd} 
                  onChange={(e) => setJsonLd(e.target.value)} 
                  placeholder='{"@context": "https://schema.org", "@type": "BlogPosting"...}' 
                  rows={5}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">Advanced: Provide custom structured data for rich snippets in Google.</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Hide from search engines (noindex)</Label>
                  <p className="text-[11px] text-muted-foreground">Adds a noindex tag to prevent this post from showing up in Google.</p>
                </div>
                <Switch checked={noindex} onCheckedChange={setNoindex} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Post thumbnail</CardTitle>
              <CardDescription>
                Upload your own, search Unsplash, or design one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThumbnailField
                value={cover}
                onChange={setCover}
                defaultTitle={title}
                folder="blog"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
              <CardDescription>Set the visibility of this post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PortalBlogPost["status"])}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Categorize to help readers discover</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categories</Label>
                <TagsInput value={categories} onChange={setCategories} placeholder="Add category..." suggestions={allCategories} />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagsInput value={tags} onChange={setTags} placeholder="Add tag..." suggestions={allTags} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
              <CardDescription>Configure reader interactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow comments</Label>
                  <p className="text-[11px] text-muted-foreground">Let readers discuss this post</p>
                </div>
                <Switch checked={allowComments} onCheckedChange={setAllowComments} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow likes</Label>
                  <p className="text-[11px] text-muted-foreground">Show like button</p>
                </div>
                <Switch checked={allowLikes} onCheckedChange={setAllowLikes} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow sharing</Label>
                  <p className="text-[11px] text-muted-foreground">Show social share links</p>
                </div>
                <Switch checked={allowSharing} onCheckedChange={setAllowSharing} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Versions sheet — pulls the current draft into the diff
          view so the teacher sees pending vs. last-saved. Restore
          loads the snapshot back into the form fields (we don't
          publish automatically — they review then save). */}
      {!isNew && existing && (
        <VersionsSheet<PortalBlogPost>
          open={versionsOpen}
          onOpenChange={setVersionsOpen}
          api={versions}
          current={{
            ...existing,
            title,
            slug: finalSlug,
            excerpt,
            coverImage: cover,
            body,
            tags,
            categories,
            status,
            seo: { title: seoTitle, description: seoDesc, jsonLd, noindex: noindex || undefined },
          } as PortalBlogPost}
          onRestore={(snapshot) => {
            // Pour the snapshot back into the form. The teacher hits
            // Save to commit (avoids "I clicked Restore and instantly
            // overwrote my prod post" panic).
            setTitle(snapshot.title)
            setSlug(snapshot.slug)
            setExcerpt(snapshot.excerpt ?? "")
            setCover(snapshot.coverImage ?? "")
            setBody(snapshot.body)
            setTags(snapshot.tags ?? [])
            setCategories(snapshot.categories ?? [])
            setStatus(snapshot.status)
            setSeoTitle(snapshot.seo?.title ?? "")
            setSeoDesc(snapshot.seo?.description ?? "")
            setJsonLd(snapshot.seo?.jsonLd ?? "")
            setNoindex(!!snapshot.seo?.noindex)
            toast.success("Restored — review the fields and hit Save to commit.")
          }}
          fieldLabels={{
            title: "Title",
            slug: "URL slug",
            excerpt: "Excerpt",
            coverImage: "Cover image",
            body: "Body",
            tags: "Tags",
            categories: "Categories",
            status: "Status",
            seo: "SEO",
          }}
        />
      )}

      {/* Reviews panel — anchored to the fields a co-author is most
          likely to comment on. Free-floating notes also welcome. */}
      {!isNew && (
        <ReviewPanel
          open={reviewsOpen}
          onOpenChange={setReviewsOpen}
          api={reviews}
          title={`Reviews · ${existing?.title ?? "Post"}`}
          description="Threaded notes anchored to specific fields of this post."
          anchorOptions={[
            { kind: "field", target: "title", label: "Title" },
            { kind: "field", target: "excerpt", label: "Excerpt" },
            { kind: "field", target: "body", label: "Body" },
            { kind: "field", target: "coverImage", label: "Cover image" },
            { kind: "field", target: "tags", label: "Tags" },
            { kind: "field", target: "seo", label: "SEO" },
          ]}
        />
      )}
    </div>
  )
}
