"use client"

// Student community detail. Reads are open to anyone who can see the
// community in the list (open / tag-gated / already-member). Writes
// — posting + commenting — are gated behind membership. Non-members
// see a "Join to post" CTA at the top of the composer slot; clicking
// it appends the user to memberIds and instantly unlocks the writer.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
  Users2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  useLMS,
  generateId,
  type BatchPost,
  type BatchPostComment,
} from "@/lib/lms-store"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { RichTextContent, isRichTextEmpty } from "@/components/editor/rich-text-content"
import { toast } from "sonner"

function initials(name?: string): string {
  if (!name) return "?"
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function StudentCommunityDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant, id } = use(params)
  const {
    currentUser,
    studentGroups,
    batchPosts,
    getUserById,
    updateStudentGroup,
    addBatchPost,
  } = useLMS()

  const group = useMemo(
    () => studentGroups.find((g) => g.id === id),
    [studentGroups, id],
  )
  const isMember = !!(currentUser && group?.memberIds.includes(currentUser.id))

  // Posts feed for this batch. Hidden posts skipped; pinned first.
  const posts = useMemo(() => {
    if (!group) return []
    return batchPosts
      .filter((p) => p.batchId === group.id && !p.hidden)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [batchPosts, group])

  const [draft, setDraft] = useState("")

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to view this community.
        </CardContent>
      </Card>
    )
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/p/${tenant}/my/communities`}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            All communities
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Users2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Community not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Browse gate — should be visible per the list-page rules. We still
  // re-check here so a deep-link with no list pre-filter doesn't
  // accidentally surface a closed community.
  const v = group.visibility ?? "closed"
  const canBrowse = isMember || v === "open" || v === "tag-gated"
  if (!canBrowse || (group.teachersOnly && currentUser.role === "student")) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/p/${tenant}/my/communities`}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            All communities
          </Link>
        </Button>
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">This community is invite-only</p>
            <p className="text-sm text-muted-foreground">
              Ask the workspace admin for an invite link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canJoin = !isMember && v === "open"

  const join = () => {
    if (!group || !currentUser || isMember) return
    updateStudentGroup(group.id, {
      memberIds: [...group.memberIds, currentUser.id],
    })
    toast.success(`Joined ${group.name} — welcome.`)
  }

  const submitPost = () => {
    if (!isMember || !group || !currentUser) return
    if (isRichTextEmpty(draft)) return
    const post: BatchPost = {
      id: generateId("post"),
      batchId: group.id,
      authorId: currentUser.id,
      body: draft,
      pinned: false,
      hidden: false,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addBatchPost(post)
    setDraft("")
    toast.success("Posted.")
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/p/${tenant}/my/communities`}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          All communities
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                {group.name}
              </h1>
              {isMember ? (
                <Badge variant="default">Member</Badge>
              ) : (
                <Badge variant="secondary">Browsing</Badge>
              )}
            </div>
            {group.purpose && (
              <p className="mt-1 text-sm text-muted-foreground">{group.purpose}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {group.memberIds.length} member
              {group.memberIds.length === 1 ? "" : "s"}
            </p>
          </div>
          {!isMember && canJoin && (
            <Button onClick={join}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Join community
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Composer — gated. Members see the rich text editor; non-
          members see a Join CTA in its place. Either way the feed
          below stays visible (reads are open). */}
      <Card>
        <CardContent className="space-y-3 p-4">
          {isMember ? (
            <>
              <RichTextEditor
                value={draft}
                onChange={setDraft}
                placeholder="Share an update, ask a question, drop a link…"
                minHeight={100}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={submitPost}
                  disabled={isRichTextEmpty(draft)}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Post
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm">
                {canJoin
                  ? "Join the community to post and comment."
                  : "You can read what's here, but only members can post."}
              </p>
              {canJoin && (
                <Button size="sm" onClick={join}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Join community
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feed */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isMember
                ? "Kick things off with the first post."
                : "Be the first to post — join the community to do it."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const author = getUserById(post.authorId)
            return (
              <Card key={post.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {author?.avatar ? (
                        <AvatarImage src={author.avatar} alt={author.name ?? ""} />
                      ) : null}
                      <AvatarFallback className="text-[11px]">
                        {initials(author?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {author?.name ?? "Member"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {timeAgo(post.createdAt)}
                        {post.pinned && " · 📌 Pinned"}
                      </p>
                    </div>
                  </div>
                  <RichTextContent html={post.body} className="text-sm" />
                  {post.comments.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {post.comments.length} comment
                      {post.comments.length === 1 ? "" : "s"}
                    </p>
                  )}
                  {isMember && (
                    <CommentComposer postId={post.id} authorId={currentUser.id} />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CommentComposer({
  postId,
  authorId,
}: {
  postId: string
  authorId: string
}) {
  const { addBatchPostComment } = useLMS()
  const [body, setBody] = useState("")
  const send = () => {
    if (isRichTextEmpty(body)) return
    const comment: BatchPostComment = {
      id: generateId("cmt"),
      authorId,
      body,
      hidden: false,
      createdAt: new Date().toISOString(),
    }
    addBatchPostComment(postId, comment)
    setBody("")
  }
  return (
    <div className="space-y-2 border-t border-border/60 pt-3">
      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder="Write a reply…"
        minHeight={60}
      />
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={send} disabled={isRichTextEmpty(body)}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Comment
        </Button>
      </div>
    </div>
  )
}
