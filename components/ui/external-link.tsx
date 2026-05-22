// Outgoing anchor with sensible safety defaults.
//
// Every external link the app renders for end-users should pass through
// this:
//   • target="_blank" so the user keeps their place on our page.
//   • rel="nofollow noopener noreferrer" so we don't pass SEO juice to
//     user-controlled URLs (instructor socials, attachment hosts, etc.)
//     and the popup can't reach back via window.opener.
//
// Use a plain <a> only when the rel/target story is genuinely different
// (e.g. internal nav handled by next/link). Internal links should keep
// using next/link, which never gets nofollow.

import type { AnchorHTMLAttributes } from "react"

export function ExternalLink({
  href,
  children,
  rel,
  target,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      target={target ?? "_blank"}
      rel={rel ?? "nofollow noopener noreferrer"}
      {...rest}
    >
      {children}
    </a>
  )
}
