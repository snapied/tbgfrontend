"use client"

// Parameterised SVG presets for the decoration block. Each preset uses
// preserveAspectRatio so the artwork scales with the bbox without
// distortion. `primary` / `accent` recolour the preset; optional `text`
// supplies a banner/seal caption.
//
// Organised into categories so the editor's Component Library can render
// them as tabbed panels rather than one flat soup. Adding a new preset:
//   1. Add a `case` branch in DecorationSvg.
//   2. Add a corresponding entry to DECORATION_PRESETS at the bottom.
//   3. Add the variant string to DecorationBlock['variant'] in
//      lib/custom-templates.ts.

export type DecorationCategory =
  | 'Ribbons'
  | 'Seals'
  | 'Badges'
  | 'Stars'
  | 'Laurels'
  | 'Dividers'
  | 'Borders'
  | 'Corners'
  | 'Shapes'

export interface DecorationSvgProps {
  variant: string
  primary: string
  accent: string
  text?: string
}

// ─── helper builders ────────────────────────────────────────────────────────
// Small private helpers that build commonly-reused SVG fragments. Inlined
// rather than imported because each preset is only a few lines anyway.

function star(cx: number, cy: number, r: number, fill: string, points = 5) {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI * i) / points - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.42
    pts.push(`${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`)
  }
  return <polygon points={pts.join(" ")} fill={fill} />
}

// ─── the big switch ─────────────────────────────────────────────────────────

export function DecorationSvg({ variant, primary, accent, text }: DecorationSvgProps) {
  const common = {
    width: "100%",
    height: "100%",
    xmlns: "http://www.w3.org/2000/svg",
  } as const

  switch (variant) {
    // ─── Ribbons ─────────────────────────────────────────────────────────
    case "ribbon-banner":
      return (
        <svg viewBox="0 0 300 80" preserveAspectRatio="xMidYMid meet" {...common}>
          <polygon points="0,20 30,40 0,60" fill={accent} />
          <polygon points="300,20 270,40 300,60" fill={accent} />
          <rect x="20" y="10" width="260" height="60" fill={primary} />
          <text x="150" y="50" textAnchor="middle" fill="#fff" fontFamily="Cinzel, Georgia, serif" fontSize="20" fontWeight="700" letterSpacing="3">
            {(text || "HONOURED").toUpperCase()}
          </text>
        </svg>
      )
    case "ribbon-corner":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <polygon points="0,0 100,0 70,30 0,30" fill={primary} />
          <polygon points="0,30 70,30 100,0 100,40 0,40" fill={accent} opacity="0.85" />
        </svg>
      )
    case "ribbon-curved":
      return (
        <svg viewBox="0 0 300 60" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M0 30 Q 150 -15 300 30 Q 150 5 0 30 Z" fill={primary} />
          <path d="M0 30 Q 150 -10 300 30 L 290 40 Q 150 5 10 40 Z" fill={accent} opacity="0.7" />
          {text && <text x="150" y="34" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="14" fontWeight="700" letterSpacing="2">{text.toUpperCase()}</text>}
        </svg>
      )
    case "ribbon-flag":
      return (
        <svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet" {...common}>
          <polygon points="0,0 200,0 180,40 200,80 0,80 20,40" fill={primary} />
          <polygon points="0,0 200,0 180,40 200,80 0,80 20,40" fill={accent} opacity="0.2" />
          {text && <text x="100" y="48" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="16" fontWeight="700" letterSpacing="3">{text.toUpperCase()}</text>}
        </svg>
      )
    case "ribbon-bow":
      return (
        <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M40 30 Q 100 0 160 30 L 160 60 Q 100 30 40 60 Z" fill={primary} />
          <circle cx="100" cy="45" r="14" fill={accent} />
          <polygon points="80,60 95,90 110,75" fill={primary} />
          <polygon points="120,60 105,90 90,75" fill={accent} opacity="0.8" />
        </svg>
      )
    case "ribbon-vintage":
      return (
        <svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M0 30 L 30 50 L 0 70 L 0 30 Z" fill={accent} />
          <path d="M300 30 L 270 50 L 300 70 L 300 30 Z" fill={accent} />
          <path d="M20 20 L 280 20 L 290 50 L 280 80 L 20 80 L 10 50 Z" fill={primary} />
          <path d="M30 30 L 270 30 M 30 70 L 270 70" stroke={accent} strokeWidth="0.8" />
          <text x="150" y="58" textAnchor="middle" fill="#fff" fontFamily="EB Garamond, Georgia, serif" fontSize="22" fontWeight="700" fontStyle="italic">{text || "Distinguished"}</text>
        </svg>
      )
    case "ribbon-modern":
      return (
        <svg viewBox="0 0 240 60" preserveAspectRatio="xMidYMid meet" {...common}>
          <rect x="0" y="10" width="240" height="40" rx="20" fill={primary} />
          <circle cx="20" cy="30" r="6" fill={accent} />
          <circle cx="220" cy="30" r="6" fill={accent} />
          <text x="120" y="36" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" letterSpacing="2">{(text || "FEATURED").toUpperCase()}</text>
        </svg>
      )
    case "ribbon-double":
      return (
        <svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <rect x="30" y="20" width="240" height="22" fill={primary} />
          <rect x="30" y="50" width="240" height="22" fill={accent} />
          <polygon points="20,20 30,31 20,42" fill={primary} />
          <polygon points="280,20 270,31 280,42" fill={primary} />
          <polygon points="20,50 30,61 20,72" fill={accent} />
          <polygon points="280,50 270,61 280,72" fill={accent} />
          {text && <text x="150" y="64" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="14" fontWeight="700" letterSpacing="2">{text.toUpperCase()}</text>}
        </svg>
      )

    // ─── Seals ───────────────────────────────────────────────────────────
    case "seal-classic":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <circle cx="50" cy="50" r="46" fill="none" stroke={primary} strokeWidth="1.5" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={primary} strokeWidth="0.6" />
          <circle cx="50" cy="50" r="32" fill={primary} />
          {star(50, 53, 14, accent)}
          <text x="50" y="86" textAnchor="middle" fill={primary} fontFamily="Cinzel, serif" fontSize="6" fontWeight="700" letterSpacing="2">
            {(text || "CERTIFIED").toUpperCase()}
          </text>
        </svg>
      )
    case "seal-circular":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <defs>
            <path id={`seal-arc-${primary}`} d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
          </defs>
          <circle cx="50" cy="50" r="46" fill={primary} />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth="0.6" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="26" fill={accent} />
          {star(50, 50, 12, "#fff")}
          <text fontFamily="Cinzel, serif" fontSize="5" fill="#fff" fontWeight="700" letterSpacing="2">
            <textPath xlinkHref={`#seal-arc-${primary}`} startOffset="2%">{(text || "OFFICIAL SEAL · CERTIFIED ·").toUpperCase()}</textPath>
          </text>
        </svg>
      )
    case "seal-foil":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <defs>
            <radialGradient id="foil" cx="35%" cy="35%">
              <stop offset="0" stopColor="#fff8dc" />
              <stop offset="0.5" stopColor={accent} />
              <stop offset="1" stopColor={primary} />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="url(#foil)" stroke={primary} strokeWidth="0.8" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.6" />
          {star(50, 50, 16, "#fff")}
        </svg>
      )
    case "seal-vintage":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <circle cx="50" cy="50" r="46" fill="none" stroke={primary} strokeWidth="2" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={primary} strokeWidth="0.4" strokeDasharray="3 1" />
          <circle cx="50" cy="50" r="30" fill={accent} stroke={primary} strokeWidth="0.8" />
          <text x="50" y="48" textAnchor="middle" fill={primary} fontFamily="EB Garamond, Georgia, serif" fontSize="14" fontWeight="700" fontStyle="italic">est.</text>
          <text x="50" y="62" textAnchor="middle" fill={primary} fontFamily="EB Garamond, Georgia, serif" fontSize="9" fontWeight="700">{text || "MMXXVI"}</text>
        </svg>
      )
    case "seal-modern":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill={primary} />
          <polygon points="50,16 82,33 82,67 50,84 18,67 18,33" fill={accent} />
          {star(50, 50, 14, "#fff")}
        </svg>
      )
    case "seal-wax":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <defs>
            <radialGradient id="wax" cx="40%" cy="38%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="0.4" stopColor={primary} />
              <stop offset="1" stopColor="#7f1d1d" />
            </radialGradient>
          </defs>
          <path d="M 50,5 L 60,15 L 75,12 L 80,27 L 95,32 L 92,47 L 100,60 L 88,68 L 92,82 L 78,84 L 70,95 L 56,90 L 45,98 L 36,88 L 22,90 L 18,76 L 6,72 L 12,58 L 4,46 L 16,38 L 12,24 L 26,22 L 32,8 L 46,12 Z" fill="url(#wax)" />
          {star(50, 50, 16, accent)}
        </svg>
      )
    case "seal-emblem":
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M50 4 L86 22 L86 70 L50 116 L14 70 L14 22 Z" fill={primary} />
          <path d="M50 16 L76 30 L76 66 L50 100 L24 66 L24 30 Z" fill={accent} />
          <text x="50" y="58" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="20" fontWeight="900">{text || "★"}</text>
        </svg>
      )
    case "seal-tag":
      return (
        <svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M10 10 L 70 10 L 90 40 L 70 70 L 10 70 Z" fill={primary} />
          <circle cx="22" cy="40" r="4" fill="#fff" />
          <text x="56" y="46" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" letterSpacing="2">{(text || "TAG").toUpperCase()}</text>
        </svg>
      )

    // ─── Badges ──────────────────────────────────────────────────────────
    case "badge-medal":
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <defs>
            <linearGradient id="med-rib" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={primary} /><stop offset="1" stopColor={accent} />
            </linearGradient>
            <linearGradient id="med-coin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fde68a" />
              <stop offset="0.55" stopColor={accent} />
              <stop offset="1" stopColor="#92400e" />
            </linearGradient>
          </defs>
          <polygon points="30,0 70,0 60,40 40,40" fill="url(#med-rib)" />
          <polygon points="38,0 62,0 56,38 44,38" fill="#fff" fillOpacity="0.18" />
          <circle cx="50" cy="74" r="30" fill="url(#med-coin)" stroke="#fff" strokeWidth="2.5" />
          {star(50, 75, 13, "#fff")}
        </svg>
      )
    case "badge-rosette":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="50" cy="22" rx="8" ry="18" fill={primary} opacity="0.85" transform={`rotate(${i * 30} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="20" fill={accent} />
          <circle cx="50" cy="50" r="14" fill={primary} />
          <text x="50" y="55" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="10" fontWeight="900">★</text>
        </svg>
      )
    case "badge-shield":
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M50 4 L90 18 Q 90 70 50 116 Q 10 70 10 18 Z" fill={primary} />
          <path d="M50 14 L82 25 Q 82 66 50 102 Q 18 66 18 25 Z" fill={accent} />
          {star(50, 56, 18, "#fff")}
        </svg>
      )
    case "badge-hexagon":
      return (
        <svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet" {...common}>
          <polygon points="50,5 92,28 92,77 50,100 8,77 8,28" fill={primary} />
          <polygon points="50,18 80,34 80,71 50,87 20,71 20,34" fill={accent} />
          <text x="50" y="62" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="16" fontWeight="900">{text || "✦"}</text>
        </svg>
      )
    case "badge-circular":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <circle cx="50" cy="50" r="46" fill={primary} />
          <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" strokeWidth="2" />
          <text x="50" y="44" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="9" fontWeight="700" letterSpacing="2">{(text || "TOP").toUpperCase()}</text>
          <text x="50" y="62" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontSize="20" fontWeight="900">{accent ? "★" : ""}</text>
        </svg>
      )
    case "badge-trophy":
      return (
        <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M30 10 L 70 10 L 70 50 Q 70 70 50 70 Q 30 70 30 50 Z" fill={primary} />
          <path d="M30 25 Q 10 25 12 45 Q 14 60 30 60" fill="none" stroke={primary} strokeWidth="4" />
          <path d="M70 25 Q 90 25 88 45 Q 86 60 70 60" fill="none" stroke={primary} strokeWidth="4" />
          <rect x="42" y="70" width="16" height="22" fill={accent} />
          <rect x="32" y="92" width="36" height="10" fill={primary} />
          {star(50, 38, 12, accent)}
        </svg>
      )
    case "badge-crown":
      return (
        <svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M10 60 L 10 20 L 30 40 L 50 10 L 70 40 L 90 20 L 90 60 Z" fill={primary} />
          <rect x="10" y="60" width="80" height="10" fill={accent} />
          <circle cx="30" cy="40" r="4" fill={accent} />
          <circle cx="50" cy="10" r="5" fill={accent} />
          <circle cx="70" cy="40" r="4" fill={accent} />
        </svg>
      )
    case "badge-banner":
      return (
        <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet" {...common}>
          <circle cx="50" cy="55" r="40" fill={primary} />
          <circle cx="50" cy="55" r="30" fill={accent} />
          {star(50, 56, 15, "#fff")}
          <path d="M22 90 L 22 124 L 35 114 L 50 124 L 65 114 L 78 124 L 78 90 Z" fill={primary} />
        </svg>
      )

    // ─── Stars ───────────────────────────────────────────────────────────
    case "star-burst":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <g fill={primary} opacity="0.85">
            <polygon points="50,4 56,28 80,18 64,40 96,42 70,52 96,72 64,62 80,86 56,68 50,96 44,68 20,86 36,62 4,72 30,52 4,42 36,40 20,18 44,28" />
          </g>
          <circle cx="50" cy="50" r="22" fill={accent} />
          {star(50, 50, 14, "#fff")}
        </svg>
      )
    case "star-classic":
      return (<svg viewBox="0 0 100 100" {...common}>{star(50, 50, 46, primary)}{star(50, 50, 30, accent)}</svg>)
    case "star-multi":
      return (
        <svg viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet" {...common}>
          {star(30, 30, 22, primary)}{star(100, 30, 28, accent)}{star(170, 30, 22, primary)}
        </svg>
      )
    case "star-sparkle":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          {star(50, 50, 40, primary, 4)}
          {star(50, 50, 28, accent, 4)}
          <circle cx="50" cy="50" r="6" fill="#fff" />
        </svg>
      )
    case "star-circle":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <circle cx="50" cy="50" r="46" fill="none" stroke={primary} strokeWidth="2" />
          {star(50, 50, 28, accent)}
        </svg>
      )
    case "star-5pt":
      return (<svg viewBox="0 0 100 100" {...common}>{star(50, 50, 44, primary)}</svg>)
    case "star-6pt":
      return (<svg viewBox="0 0 100 100" {...common}>{star(50, 50, 44, primary, 6)}</svg>)
    case "star-8pt":
      return (<svg viewBox="0 0 100 100" {...common}>{star(50, 50, 44, primary, 8)}</svg>)

    // ─── Laurels ─────────────────────────────────────────────────────────
    case "laurel-wreath":
      return (
        <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <LaurelBranch side="left" primary={primary} accent={accent} />
          <LaurelBranch side="right" primary={primary} accent={accent} />
          {text && (
            <text x="100" y="68" textAnchor="middle" fill={primary} fontFamily="Cinzel, serif" fontSize="18" fontWeight="700" letterSpacing="3">{text}</text>
          )}
        </svg>
      )
    case "laurel-branch-left":
      return (<svg viewBox="0 0 100 120" {...common}><LaurelBranch side="left" primary={primary} accent={accent} /></svg>)
    case "laurel-branch-right":
      return (<svg viewBox="0 0 100 120" {...common}><LaurelBranch side="right" primary={primary} accent={accent} /></svg>)
    case "olive-wreath":
      return (
        <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <g transform="translate(100,60)">
            {Array.from({ length: 18 }).map((_, i) => {
              const ang = (i / 18) * Math.PI * 2
              return (
                <ellipse key={i} cx={Math.cos(ang) * 46} cy={Math.sin(ang) * 38} rx="10" ry="4" fill={i % 2 === 0 ? primary : accent} opacity="0.8" transform={`rotate(${(ang * 180) / Math.PI} ${Math.cos(ang) * 46} ${Math.sin(ang) * 38})`} />
              )
            })}
          </g>
        </svg>
      )
    case "floral-wreath":
      return (
        <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" {...common}>
          <g transform="translate(100,60)">
            {Array.from({ length: 12 }).map((_, i) => {
              const ang = (i / 12) * Math.PI * 2
              return (
                <g key={i} transform={`translate(${Math.cos(ang) * 44} ${Math.sin(ang) * 36})`}>
                  <circle r="6" fill={primary} />
                  <circle r="3" fill={accent} />
                </g>
              )
            })}
          </g>
        </svg>
      )
    case "award-wreath":
      return (
        <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid meet" {...common}>
          <LaurelBranch side="left" primary={primary} accent={accent} />
          <LaurelBranch side="right" primary={primary} accent={accent} />
          {star(100, 70, 22, accent)}
          {text && <text x="100" y="120" textAnchor="middle" fill={primary} fontFamily="Cinzel, serif" fontSize="12" fontWeight="700" letterSpacing="3">{text.toUpperCase()}</text>}
        </svg>
      )

    // ─── Dividers ────────────────────────────────────────────────────────
    case "divider-ornate":
      return (
        <svg viewBox="0 0 300 30" preserveAspectRatio="xMidYMid meet" {...common}>
          <line x1="10" y1="15" x2="135" y2="15" stroke={primary} />
          <line x1="165" y1="15" x2="290" y2="15" stroke={primary} />
          <g transform="translate(150,15)">
            <path d="M-12 0 L0 -8 L12 0 L0 8 Z" fill={accent} />
            <circle r="3" fill={primary} />
          </g>
          <circle cx="20" cy="15" r="2" fill={primary} /><circle cx="280" cy="15" r="2" fill={primary} />
        </svg>
      )
    case "divider-simple":
      return (<svg viewBox="0 0 300 4" {...common}><rect width="300" height="2" y="1" fill={primary} /></svg>)
    case "divider-double":
      return (
        <svg viewBox="0 0 300 10" preserveAspectRatio="xMidYMid meet" {...common}>
          <rect width="300" height="1" y="2" fill={primary} />
          <rect width="300" height="1" y="7" fill={primary} />
        </svg>
      )
    case "divider-dotted":
      return (
        <svg viewBox="0 0 300 6" preserveAspectRatio="xMidYMid meet" {...common}>
          {Array.from({ length: 30 }).map((_, i) => <circle key={i} cx={5 + i * 10} cy="3" r="1.5" fill={primary} />)}
        </svg>
      )
    case "divider-vintage":
      return (
        <svg viewBox="0 0 300 24" preserveAspectRatio="xMidYMid meet" {...common}>
          <line x1="0" y1="12" x2="300" y2="12" stroke={primary} strokeWidth="0.6" />
          <g transform="translate(150,12)">
            <path d="M-30 0 Q -15 -8 0 0 Q 15 8 30 0" stroke={accent} fill="none" />
            <circle r="3" fill={primary} />
          </g>
        </svg>
      )
    case "divider-floral":
      return (
        <svg viewBox="0 0 300 30" preserveAspectRatio="xMidYMid meet" {...common}>
          <line x1="0" y1="15" x2="120" y2="15" stroke={primary} />
          <line x1="180" y1="15" x2="300" y2="15" stroke={primary} />
          <g transform="translate(150,15)" fill={accent}>
            <circle cx="-12" r="3" /><circle r="5" /><circle cx="12" r="3" />
          </g>
        </svg>
      )
    case "divider-chevron":
      return (
        <svg viewBox="0 0 300 20" preserveAspectRatio="xMidYMid meet" {...common}>
          <line x1="0" y1="10" x2="140" y2="10" stroke={primary} />
          <line x1="160" y1="10" x2="300" y2="10" stroke={primary} />
          <polygon points="140,10 150,2 160,10 150,18" fill={accent} />
        </svg>
      )

    // ─── Borders ─────────────────────────────────────────────────────────
    case "border-classic":
      return (
        <svg viewBox="0 0 200 140" preserveAspectRatio="none" {...common}>
          <rect x="2" y="2" width="196" height="136" fill="none" stroke={primary} strokeWidth="3" />
          <rect x="8" y="8" width="184" height="124" fill="none" stroke={primary} strokeWidth="0.8" />
        </svg>
      )
    case "border-double":
      return (
        <svg viewBox="0 0 200 140" preserveAspectRatio="none" {...common}>
          <rect x="3" y="3" width="194" height="134" fill="none" stroke={primary} strokeWidth="2" />
          <rect x="9" y="9" width="182" height="122" fill="none" stroke={accent} strokeWidth="2" />
        </svg>
      )
    case "border-art-deco":
      return (
        <svg viewBox="0 0 200 140" preserveAspectRatio="none" {...common}>
          <rect x="3" y="3" width="194" height="134" fill="none" stroke={primary} strokeWidth="2" />
          <path d="M3 20 L 20 3 M3 120 L 20 137 M180 3 L 197 20 M180 137 L 197 120" stroke={accent} strokeWidth="2" />
          <polygon points="100,3 110,8 100,13 90,8" fill={accent} />
          <polygon points="100,127 110,132 100,137 90,132" fill={accent} />
        </svg>
      )
    case "border-dashed":
      return (
        <svg viewBox="0 0 200 140" preserveAspectRatio="none" {...common}>
          <rect x="3" y="3" width="194" height="134" fill="none" stroke={primary} strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
      )
    case "border-rounded":
      return (
        <svg viewBox="0 0 200 140" preserveAspectRatio="none" {...common}>
          <rect x="3" y="3" width="194" height="134" rx="20" fill="none" stroke={primary} strokeWidth="2" />
          <rect x="9" y="9" width="182" height="122" rx="14" fill="none" stroke={accent} strokeWidth="0.6" />
        </svg>
      )
    case "border-flourish":
      return (
        <svg viewBox="0 0 200 140" preserveAspectRatio="none" {...common}>
          <rect x="3" y="3" width="194" height="134" fill="none" stroke={primary} strokeWidth="1" />
          <path d="M3 30 Q 20 3 50 3 M150 3 Q 180 3 197 30 M3 110 Q 20 137 50 137 M150 137 Q 180 137 197 110" stroke={accent} strokeWidth="2" fill="none" />
        </svg>
      )

    // ─── Corners ─────────────────────────────────────────────────────────
    case "corner-flourish":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <g stroke={primary} fill="none" strokeWidth="1.4">
            <path d="M5 5 L50 5" />
            <path d="M5 5 L5 50" />
            <path d="M5 5 Q 40 10 50 50" />
            <path d="M5 5 Q 30 25 50 50" />
            <path d="M5 5 Q 14 38 50 50" />
          </g>
          <circle cx="5" cy="5" r="3" fill={accent} />
        </svg>
      )
    case "corner-classic":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M5 5 L 30 5 M5 5 L 5 30" stroke={primary} strokeWidth="2" />
          <path d="M10 10 L 25 10 M10 10 L 10 25" stroke={accent} />
          <circle cx="5" cy="5" r="3" fill={accent} />
        </svg>
      )
    case "corner-art-deco":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M5 5 L 60 5 M5 5 L 5 60" stroke={primary} strokeWidth="2" />
          <path d="M5 30 L 30 5 M 5 50 L 50 5" stroke={accent} strokeWidth="1" />
          <polygon points="5,5 12,12 5,19" fill={accent} />
        </svg>
      )
    case "corner-modern":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M5 5 L 50 5 L 50 12 L 12 12 L 12 50 L 5 50 Z" fill={primary} />
          <circle cx="50" cy="50" r="3" fill={accent} />
        </svg>
      )
    case "corner-floral":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" {...common}>
          <path d="M5 5 L 40 5" stroke={primary} />
          <path d="M5 5 L 5 40" stroke={primary} />
          <circle cx="20" cy="20" r="4" fill={accent} />
          <circle cx="30" cy="10" r="2" fill={primary} />
          <circle cx="10" cy="30" r="2" fill={primary} />
        </svg>
      )

    // ─── Shapes / Patterns ───────────────────────────────────────────────
    case "shape-hexagon":
      return (<svg viewBox="0 0 100 110" {...common}><polygon points="50,5 92,28 92,77 50,100 8,77 8,28" fill={primary} /></svg>)
    case "shape-diamond":
      return (<svg viewBox="0 0 100 100" {...common}><polygon points="50,4 96,50 50,96 4,50" fill={primary} /></svg>)
    case "shape-triangle":
      return (<svg viewBox="0 0 100 100" {...common}><polygon points="50,4 96,96 4,96" fill={primary} /></svg>)
    case "shape-circle":
      return (<svg viewBox="0 0 100 100" {...common}><circle cx="50" cy="50" r="46" fill={primary} /></svg>)
    case "shape-arrow":
      return (
        <svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet" {...common}>
          <polygon points="0,20 140,20 140,5 195,40 140,75 140,60 0,60" fill={primary} />
        </svg>
      )
    case "pattern-dots":
      return (
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" {...common}>
          {Array.from({ length: 100 }).map((_, i) => (
            <circle key={i} cx={(i % 20) * 10 + 5} cy={Math.floor(i / 20) * 20 + 10} r="2" fill={primary} opacity="0.6" />
          ))}
        </svg>
      )
    case "pattern-stripes":
      return (
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" {...common}>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={i * 18} y="0" width="6" height="100" fill={primary} opacity="0.6" />
          ))}
        </svg>
      )
    case "pattern-grid":
      return (
        <svg viewBox="0 0 200 200" preserveAspectRatio="none" {...common}>
          {Array.from({ length: 10 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} stroke={primary} strokeWidth="0.5" opacity="0.5" />)}
          {Array.from({ length: 10 }).map((_, i) => <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="200" stroke={primary} strokeWidth="0.5" opacity="0.5" />)}
        </svg>
      )

    default:
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <rect width="100" height="100" fill="none" stroke={primary} strokeDasharray="4 2" />
          <text x="50" y="55" textAnchor="middle" fill={primary} fontSize="10">{variant}</text>
        </svg>
      )
  }
}

// Reusable laurel half-branch used by several wreath variants.
function LaurelBranch({ side, primary, accent }: { side: "left" | "right"; primary: string; accent: string }) {
  const flip = side === "right"
  return (
    <g transform={flip ? "translate(180,60) scale(-1,1)" : "translate(20,60)"}>
      <path d="M0 0 Q 30 -10 60 0" stroke={primary} strokeWidth="2" fill="none" />
      {[5, 15, 25, 35, 45, 55].map((x, i) => (
        <ellipse key={`a${i}`} cx={x} cy={-3 - i} rx="9" ry="4" fill={primary} opacity="0.85" transform={`rotate(-${30 - i * 4} ${x} ${-3 - i})`} />
      ))}
      {[5, 15, 25, 35, 45, 55].map((x, i) => (
        <ellipse key={`b${i}`} cx={x} cy={3 + i * 0.5} rx="9" ry="4" fill={accent} opacity="0.7" transform={`rotate(${30 - i * 4} ${x} ${3 + i * 0.5})`} />
      ))}
    </g>
  )
}

// ─── Catalogue used by the editor ──────────────────────────────────────────
export interface DecorationPreset {
  variant: string
  label: string
  category: DecorationCategory
  w: number
  h: number
  primary: string
  accent: string
  text?: string
}

export const DECORATION_PRESETS: DecorationPreset[] = [
  // Ribbons (8)
  { variant: "ribbon-banner",  label: "Banner ribbon",  category: "Ribbons", w: 360, h: 90, primary: "#b91c1c", accent: "#7f1d1d", text: "HONOURED" },
  { variant: "ribbon-corner",  label: "Corner ribbon",  category: "Ribbons", w: 140, h: 140, primary: "#7c3aed", accent: "#a855f7" },
  { variant: "ribbon-curved",  label: "Curved ribbon",  category: "Ribbons", w: 360, h: 80, primary: "#0ea5e9", accent: "#0369a1", text: "AWARDED" },
  { variant: "ribbon-flag",    label: "Flag ribbon",    category: "Ribbons", w: 260, h: 100, primary: "#f59e0b", accent: "#b45309", text: "WINNER" },
  { variant: "ribbon-bow",     label: "Bow ribbon",     category: "Ribbons", w: 240, h: 140, primary: "#dc2626", accent: "#fbbf24" },
  { variant: "ribbon-vintage", label: "Vintage ribbon", category: "Ribbons", w: 380, h: 120, primary: "#7c2d12", accent: "#fde68a", text: "Distinguished" },
  { variant: "ribbon-modern",  label: "Modern ribbon",  category: "Ribbons", w: 300, h: 70, primary: "#0f172a", accent: "#d4af37", text: "FEATURED" },
  { variant: "ribbon-double",  label: "Double ribbon",  category: "Ribbons", w: 360, h: 120, primary: "#7c3aed", accent: "#0ea5e9", text: "AWARDED" },

  // Seals (8)
  { variant: "seal-classic",  label: "Classic seal",   category: "Seals", w: 140, h: 160, primary: "#0f172a", accent: "#d4af37", text: "CERTIFIED" },
  { variant: "seal-circular", label: "Circular seal",  category: "Seals", w: 160, h: 160, primary: "#7c2d12", accent: "#fbbf24", text: "OFFICIAL SEAL · CERTIFIED ·" },
  { variant: "seal-foil",     label: "Foil seal",      category: "Seals", w: 150, h: 150, primary: "#7c3aed", accent: "#fbbf24" },
  { variant: "seal-vintage",  label: "Vintage seal",   category: "Seals", w: 160, h: 160, primary: "#7c2d12", accent: "#fde68a", text: "MMXXVI" },
  { variant: "seal-modern",   label: "Modern seal",    category: "Seals", w: 160, h: 160, primary: "#0f172a", accent: "#0ea5e9" },
  { variant: "seal-wax",      label: "Wax seal",       category: "Seals", w: 140, h: 140, primary: "#dc2626", accent: "#fef3c7" },
  { variant: "seal-emblem",   label: "Shield emblem",  category: "Seals", w: 130, h: 160, primary: "#1e3a8a", accent: "#fbbf24", text: "★" },
  { variant: "seal-tag",      label: "Tag seal",       category: "Seals", w: 200, h: 140, primary: "#0f172a", accent: "#fff", text: "VIP" },

  // Badges (8)
  { variant: "badge-medal",    label: "Medal badge",    category: "Badges", w: 140, h: 180, primary: "#7c3aed", accent: "#f59e0b" },
  { variant: "badge-rosette",  label: "Rosette",        category: "Badges", w: 160, h: 160, primary: "#0ea5e9", accent: "#0f172a" },
  { variant: "badge-shield",   label: "Shield badge",   category: "Badges", w: 130, h: 160, primary: "#1e3a8a", accent: "#fbbf24" },
  { variant: "badge-hexagon",  label: "Hexagon badge",  category: "Badges", w: 140, h: 160, primary: "#0f5132", accent: "#fbbf24", text: "✦" },
  { variant: "badge-circular", label: "Circular badge", category: "Badges", w: 140, h: 140, primary: "#7c2d12", accent: "#fbbf24", text: "TOP" },
  { variant: "badge-trophy",   label: "Trophy badge",   category: "Badges", w: 140, h: 180, primary: "#b45309", accent: "#fbbf24" },
  { variant: "badge-crown",    label: "Crown badge",    category: "Badges", w: 180, h: 140, primary: "#facc15", accent: "#ef4444" },
  { variant: "badge-banner",   label: "Banner badge",   category: "Badges", w: 160, h: 200, primary: "#7c3aed", accent: "#a855f7" },

  // Stars (8)
  { variant: "star-burst",   label: "Sun burst",   category: "Stars", w: 140, h: 140, primary: "#f59e0b", accent: "#b45309" },
  { variant: "star-classic", label: "Classic star",category: "Stars", w: 140, h: 140, primary: "#f59e0b", accent: "#fbbf24" },
  { variant: "star-multi",   label: "Three stars", category: "Stars", w: 280, h: 100, primary: "#f59e0b", accent: "#fbbf24" },
  { variant: "star-sparkle", label: "Sparkle",     category: "Stars", w: 140, h: 140, primary: "#fbbf24", accent: "#f59e0b" },
  { variant: "star-circle",  label: "Star in ring",category: "Stars", w: 140, h: 140, primary: "#0f172a", accent: "#fbbf24" },
  { variant: "star-5pt",     label: "5-point star",category: "Stars", w: 140, h: 140, primary: "#0f172a", accent: "#0f172a" },
  { variant: "star-6pt",     label: "6-point star",category: "Stars", w: 140, h: 140, primary: "#0f172a", accent: "#0f172a" },
  { variant: "star-8pt",     label: "8-point star",category: "Stars", w: 140, h: 140, primary: "#0f172a", accent: "#0f172a" },

  // Laurels (5)
  { variant: "laurel-wreath",       label: "Laurel wreath",      category: "Laurels", w: 320, h: 180, primary: "#0f5132", accent: "#198754", text: "EXCELLENCE" },
  { variant: "laurel-branch-left",  label: "Laurel — left branch",  category: "Laurels", w: 200, h: 160, primary: "#0f5132", accent: "#198754" },
  { variant: "laurel-branch-right", label: "Laurel — right branch", category: "Laurels", w: 200, h: 160, primary: "#0f5132", accent: "#198754" },
  { variant: "olive-wreath",        label: "Olive wreath",       category: "Laurels", w: 320, h: 180, primary: "#15803d", accent: "#86efac" },
  { variant: "floral-wreath",       label: "Floral wreath",      category: "Laurels", w: 320, h: 180, primary: "#be185d", accent: "#f9a8d4" },
  { variant: "award-wreath",        label: "Award wreath",       category: "Laurels", w: 320, h: 220, primary: "#0f5132", accent: "#d4af37", text: "AWARDED" },

  // Dividers (7)
  { variant: "divider-ornate",   label: "Ornate divider",  category: "Dividers", w: 360, h: 36, primary: "#0f172a", accent: "#d4af37" },
  { variant: "divider-simple",   label: "Hairline",        category: "Dividers", w: 360, h: 6,  primary: "#0f172a", accent: "#0f172a" },
  { variant: "divider-double",   label: "Double line",     category: "Dividers", w: 360, h: 14, primary: "#0f172a", accent: "#0f172a" },
  { variant: "divider-dotted",   label: "Dotted divider",  category: "Dividers", w: 360, h: 12, primary: "#0f172a", accent: "#0f172a" },
  { variant: "divider-vintage",  label: "Vintage divider", category: "Dividers", w: 360, h: 28, primary: "#7c2d12", accent: "#b45309" },
  { variant: "divider-floral",   label: "Floral divider",  category: "Dividers", w: 360, h: 30, primary: "#0f172a", accent: "#be185d" },
  { variant: "divider-chevron",  label: "Chevron divider", category: "Dividers", w: 360, h: 26, primary: "#0f172a", accent: "#0ea5e9" },

  // Borders (6) — meant to span large areas of the cert
  { variant: "border-classic",  label: "Classic border",  category: "Borders", w: 1080, h: 740, primary: "#0f172a", accent: "#0f172a" },
  { variant: "border-double",   label: "Double border",   category: "Borders", w: 1080, h: 740, primary: "#0f172a", accent: "#d4af37" },
  { variant: "border-art-deco", label: "Art deco border", category: "Borders", w: 1080, h: 740, primary: "#0f172a", accent: "#d4af37" },
  { variant: "border-dashed",   label: "Dashed border",   category: "Borders", w: 1080, h: 740, primary: "#475569", accent: "#475569" },
  { variant: "border-rounded",  label: "Rounded border",  category: "Borders", w: 1080, h: 740, primary: "#0f172a", accent: "#94a3b8" },
  { variant: "border-flourish", label: "Flourish border", category: "Borders", w: 1080, h: 740, primary: "#0f172a", accent: "#d4af37" },

  // Corners (5)
  { variant: "corner-flourish", label: "Flourish corner", category: "Corners", w: 160, h: 160, primary: "#d4af37", accent: "#0f172a" },
  { variant: "corner-classic",  label: "Classic corner",  category: "Corners", w: 120, h: 120, primary: "#0f172a", accent: "#d4af37" },
  { variant: "corner-art-deco", label: "Art-deco corner", category: "Corners", w: 140, h: 140, primary: "#d4af37", accent: "#0f172a" },
  { variant: "corner-modern",   label: "Modern corner",   category: "Corners", w: 140, h: 140, primary: "#0f172a", accent: "#0ea5e9" },
  { variant: "corner-floral",   label: "Floral corner",   category: "Corners", w: 140, h: 140, primary: "#0f172a", accent: "#be185d" },

  // Shapes / patterns (8)
  { variant: "shape-hexagon",  label: "Hexagon",  category: "Shapes", w: 140, h: 160, primary: "#0ea5e9", accent: "#0ea5e9" },
  { variant: "shape-diamond",  label: "Diamond",  category: "Shapes", w: 140, h: 140, primary: "#7c3aed", accent: "#7c3aed" },
  { variant: "shape-triangle", label: "Triangle", category: "Shapes", w: 140, h: 140, primary: "#0f172a", accent: "#0f172a" },
  { variant: "shape-circle",   label: "Circle",   category: "Shapes", w: 140, h: 140, primary: "#0f172a", accent: "#0f172a" },
  { variant: "shape-arrow",    label: "Arrow",    category: "Shapes", w: 240, h: 100, primary: "#0ea5e9", accent: "#0ea5e9" },
  { variant: "pattern-dots",   label: "Dot pattern",    category: "Shapes", w: 300, h: 200, primary: "#0f172a", accent: "#0f172a" },
  { variant: "pattern-stripes",label: "Stripe pattern", category: "Shapes", w: 300, h: 200, primary: "#0f172a", accent: "#0f172a" },
  { variant: "pattern-grid",   label: "Grid pattern",   category: "Shapes", w: 300, h: 200, primary: "#94a3b8", accent: "#94a3b8" },
]

export const DECORATION_CATEGORIES: DecorationCategory[] =
  ["Ribbons", "Seals", "Badges", "Stars", "Laurels", "Dividers", "Borders", "Corners", "Shapes"]
