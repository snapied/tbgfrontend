// Course language registry.
//
// Distinct from the portal i18n locales (lib/i18n.tsx) — that one
// controls which UI language each VISITOR sees. This list is the set
// of languages a CREATOR can mark their course as taught in. Same
// roster as the portal i18n picker for now (10 Indian languages
// + 5 international coming-soon), but the two are intentionally
// decoupled: a creator might teach a course in English while their
// portal chrome is rendered to a student in Tamil.
//
// `available: false` means the option appears in the picker but is
// disabled — it shows our roadmap to creators without letting them
// pick a language students can't pick on the portal side yet. When
// a language flips on at the portal layer, flip it here too.

export interface CourseLanguage {
  /** The string stored on Course.language. Stable, English. */
  name: string
  /** Native script in parentheses for the picker option label, so a
   *  creator scanning the dropdown can find their language without
   *  reading transliterations. */
  native?: string
  /** Whether the option is selectable today. false → rendered
   *  disabled with a "Coming soon" tag. */
  available: boolean
}

export const COURSE_LANGUAGES: CourseLanguage[] = [
  // ── Live — fully supported on the student portal ──────────────
  { name: "English",   available: true },
  { name: "Hindi",     native: "हिन्दी",     available: true },
  { name: "Bengali",   native: "বাংলা",       available: true },
  { name: "Tamil",     native: "தமிழ்",       available: true },
  { name: "Telugu",    native: "తెలుగు",      available: true },
  { name: "Marathi",   native: "मराठी",       available: true },
  { name: "Gujarati",  native: "ગુજરાતી",     available: true },
  { name: "Kannada",   native: "ಕನ್ನಡ",       available: true },
  { name: "Malayalam", native: "മലയാളം",      available: true },
  { name: "Punjabi",   native: "ਪੰਜਾਬੀ",     available: true },
  // ── Coming soon — surfaced in the picker as disabled so the
  //    roadmap is visible. Order matches lib/i18n.tsx.
  { name: "Spanish",    native: "Español",          available: false },
  { name: "French",     native: "Français",         available: false },
  { name: "Arabic",     native: "العربية",          available: false },
  { name: "Portuguese", native: "Português",        available: false },
  { name: "Indonesian", native: "Bahasa Indonesia", available: false },
]

/** True when a value is selectable today (i.e. matches an
 *  `available: true` row). Used by Select dropdowns to disable the
 *  Submit button if the stored value somehow points at a not-yet-
 *  available language. */
export function isCourseLanguageAvailable(name: string): boolean {
  const lower = name.trim().toLowerCase()
  return COURSE_LANGUAGES.some(
    (l) => l.available && l.name.toLowerCase() === lower,
  )
}
