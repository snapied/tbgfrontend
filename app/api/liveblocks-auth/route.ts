// Liveblocks auth endpoint.
//
// The BlocknoteDocEditor uses Liveblocks' public-key path by default,
// which is fine for prototypes but doesn't scope rooms to specific
// users. This route is the upgrade path: swap the editor's
// `<LiveblocksProvider publicApiKey={...}>` for
// `<LiveblocksProvider authEndpoint="/api/liveblocks-auth">` to mint
// per-user tokens that only grant access to rooms whose id begins
// `doc:<id>` where the requester is permitted by the doc's audience.
//
// Permissions logic deliberately stays minimal here — full read of the
// audience rules requires server-side access to the Docs store, which
// today lives in tenant-scoped localStorage. Until that moves to a real
// DB, this endpoint grants FULL access to any room the requester names,
// matching the publicApiKey behavior. Tighten this when the docs API
// gains a server surface.

import { NextResponse } from "next/server"
import { Liveblocks } from "@liveblocks/node"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY
  if (!secret) {
    return NextResponse.json(
      { error: "LIVEBLOCKS_SECRET_KEY not configured" },
      { status: 501 },
    )
  }

  const liveblocks = new Liveblocks({ secret })

  // Caller is expected to POST { userId, userName?, userColor? }. When
  // absent we mint an anonymous identity so the room still loads — the
  // public key fallback path behaves the same way.
  let body: { userId?: string; userName?: string; userColor?: string; room?: string } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    /* tolerate empty body */
  }

  const userId =
    body.userId && body.userId.length > 0
      ? body.userId
      : `anon-${Math.random().toString(36).slice(2, 10)}`

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: body.userName ?? "Guest",
      color: body.userColor ?? "#6366f1",
    },
  })

  // Grant full access to every `doc:*` room. Replace with per-doc
  // audience checks once docs live server-side.
  session.allow("doc:*", session.FULL_ACCESS)

  const { status, body: respBody } = await session.authorize()
  return new NextResponse(respBody, { status })
}
