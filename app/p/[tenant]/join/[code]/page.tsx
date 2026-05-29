"use client"

// Tenant-scoped community join page. Visitors land here from the
// invite link the teacher copied from /dashboard/batches/<id> →
// `${origin}/p/<tenant>/join/<code>`. We resolve the community by
// inviteCode + tenant, append the signed-in user to memberIds, and
// route them straight into the community feed.
//
// Edge cases:
//   • Not signed in → bounce to /p/<tenant>/login?next=<current> so
//     they come back to the same join after auth.
//   • Code doesn't match any community in this tenant → friendly
//     "invalid link" card.
//   • Already a member → skip the join write, route straight in.

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Lock, Sparkles, Users2 } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLMS } from "@/lib/lms-store"
import { useTenantBrand } from "@/lib/tenant-brand"
import { toast } from "sonner"

export default function CommunityJoinPage({
  params,
}: {
  params: Promise<{ tenant: string; code: string }>
}) {
  const { tenant, code } = use(params)
  const router = useRouter()
  const brand = useTenantBrand()
  const { currentUser, studentGroups, updateStudentGroup, hydrated } = useLMS()

  type Phase =
    | { kind: "loading" }
    | { kind: "needs-auth" }
    | { kind: "ready"; groupId: string; alreadyMember: boolean; groupName: string }
    | { kind: "invalid" }
  const [phase, setPhase] = useState<Phase>({ kind: "loading" })

  // Resolve once the store has hydrated. Sign-in state determines
  // whether we land on the join card or bounce to login.
  useEffect(() => {
    if (!hydrated) return
    const group = studentGroups.find(
      (g) => g.inviteCode && g.inviteCode === code,
    )
    if (!group) {
      setPhase({ kind: "invalid" })
      return
    }
    if (!currentUser) {
      setPhase({ kind: "needs-auth" })
      return
    }
    setPhase({
      kind: "ready",
      groupId: group.id,
      groupName: group.name,
      alreadyMember: group.memberIds.includes(currentUser.id),
    })
  }, [hydrated, code, studentGroups, currentUser])

  const acceptJoin = () => {
    if (phase.kind !== "ready" || !currentUser) return
    const group = studentGroups.find((g) => g.id === phase.groupId)
    if (!group) return
    if (!group.memberIds.includes(currentUser.id)) {
      updateStudentGroup(group.id, {
        memberIds: [...group.memberIds, currentUser.id],
      })
      toast.success(`Joined ${group.name} — welcome.`)
    }
    router.replace(`/p/${tenant}/my/communities/${group.id}`)
  }

  if (phase.kind === "needs-auth") {
    const next = encodeURIComponent(`/p/${tenant}/join/${code}`)
    return (
      <Centered>
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Users2 className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-xl font-bold">
              Sign in to join {brand.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              You&apos;re one click away from the community — sign in and we&apos;ll bring you right back to accept the invite.
            </p>
            <Button asChild className="w-full">
              <Link href={`/p/${tenant}/login?next=${next}`}>
                Sign in to continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Centered>
    )
  }

  if (phase.kind === "invalid") {
    return (
      <Centered>
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-xl font-bold">Invite link no good</h1>
            <p className="text-sm text-muted-foreground">
              This link doesn&apos;t match any community in {brand.name}. The admin may have rotated the code — ask them for a fresh one.
            </p>
            <BackButton label="Back" fallbackHref={`/p/${tenant}`} />
          </CardContent>
        </Card>
      </Centered>
    )
  }

  if (phase.kind === "ready") {
    return (
      <Centered>
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-xl font-bold">
              Join {phase.groupName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {phase.alreadyMember
                ? "You're already a member — jumping you straight in."
                : `Hit the button to accept the invite — you'll land inside the community.`}
            </p>
            <Button onClick={acceptJoin} className="w-full">
              {phase.alreadyMember ? "Open community" : `Join ${phase.groupName}`}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </Centered>
    )
  }

  return (
    <Centered>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-6 py-12">
      <div className="w-full">{children}</div>
    </div>
  )
}
