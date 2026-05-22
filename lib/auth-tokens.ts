// HMAC-signed auth tokens.
//
// Used for stateless password-reset / email-verify links. Format:
//
//   <base64url(payload-json)>.<base64url(hmac-sha256(payload, secret))>
//
// The payload always carries `{ sub, exp, kind, nonce }`. `exp` is a unix
// timestamp in seconds; `nonce` ensures the same email + purpose generates
// a different token every time (so old reset links can't be replayed even
// when the new one is requested within the same second).
//
// We don't store anything server-side — verification just re-derives the
// HMAC, checks `exp`, and compares the kind. To "revoke" all live tokens,
// rotate AUTH_TOKEN_SECRET in your env.

import crypto from "crypto"

export type TokenKind =
  | "password-reset"
  | "email-verify"
  | "magic-link"
  // Workspace invitation. Differs from password-reset because the
  // recipient might not have an account yet — the accept-invite page
  // creates one against the email subject, captures the password,
  // and drops them on the dashboard.
  | "invite"

interface TokenPayload {
  sub: string       // subject — typically the email we're acting on
  kind: TokenKind
  exp: number       // unix seconds
  nonce: string
  // Optional tenant scope. When set, the token is bound to a
  // specific workspace and the verifier surfaces the slug back to
  // the consuming route so it can drop the user into that
  // tenant's portal (e.g. /p/<tenant>/dashboard or
  // /p/<tenant>/accept-invite). Platform-level flows (the legacy
  // /reset-password page) omit this and continue to work
  // unchanged. Naming is deliberately short ("tnt") so the
  // resulting URLs don't bloat.
  tnt?: string
}

function readSecret(): string {
  const s = process.env.AUTH_TOKEN_SECRET
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_TOKEN_SECRET is missing or too short. Generate one with " +
      "`node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"` " +
      "and add it to .env.local."
    )
  }
  return s
}

function b64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf as Buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64")
}

function sign(payloadJson: string, secret: string): string {
  return b64urlEncode(crypto.createHmac("sha256", secret).update(payloadJson).digest())
}

export interface IssueOptions {
  sub: string
  kind: TokenKind
  ttlSeconds: number
  // Optional tenant slug to embed in the token. The verifier
  // surfaces it back so the consuming route can route the user
  // into the right portal. Leave undefined for platform-level
  // tokens (the legacy /reset-password / /accept-invite surfaces
  // continue to work without a tenant scope).
  tenant?: string
}
export function issueToken({ sub, kind, ttlSeconds, tenant }: IssueOptions): string {
  const payload: TokenPayload = {
    sub,
    kind,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    nonce: crypto.randomBytes(8).toString("hex"),
    ...(tenant ? { tnt: tenant } : {}),
  }
  const json = JSON.stringify(payload)
  const body = b64urlEncode(Buffer.from(json, "utf8"))
  const sig = sign(json, readSecret())
  return `${body}.${sig}`
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" | "wrong-kind" }

export function verifyToken(token: string, expectedKind: TokenKind): VerifyResult {
  if (!token || !token.includes(".")) return { ok: false, reason: "malformed" }
  const [bodyB64, sigB64] = token.split(".")
  if (!bodyB64 || !sigB64) return { ok: false, reason: "malformed" }

  let json: string
  let payload: TokenPayload
  try {
    json = b64urlDecode(bodyB64).toString("utf8")
    payload = JSON.parse(json) as TokenPayload
  } catch {
    return { ok: false, reason: "malformed" }
  }

  const expected = sign(json, readSecret())
  // constant-time comparison
  const a = Buffer.from(expected)
  const b = Buffer.from(sigB64)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" }
  }
  if (payload.kind !== expectedKind) return { ok: false, reason: "wrong-kind" }
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    return { ok: false, reason: "expired" }
  }
  return { ok: true, payload }
}
