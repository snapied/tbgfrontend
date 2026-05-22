"use client"

// Tiny context-based i18n for the customer portal.
//
// We deliberately avoid pulling in a full i18n framework
// (next-intl, react-intl, i18next) because:
//   1. The translation surface today is small — header nav, a few
//      CTAs, error states. A library adds 50+ KB to first-load JS
//      for value we don't yet use.
//   2. We already build per-tenant locale switching anyway (each
//      tenant should be able to default its portal to Hindi,
//      Tamil, etc.). A Context provider is the right scope.
//   3. Swapping to next-intl later is mechanical — keep the
//      `useT()` shape and dictionaries flat so the migration is a
//      find/replace.
//
// v1 ships INDIA-ONLY: every Indian-language locale below carries
// real native translations. Non-Indian locales are present in the
// picker as `disabled: true` ("Coming soon") so visitors see we're
// planning them, without us shipping half-finished dictionaries.
//
// Persisted per visitor in localStorage under PORTAL_LOCALE_KEY.
// Falls back through:
//   1. The persisted choice from a previous visit.
//   2. The tenant's configured default (via the `defaultLocale`
//      prop on the provider).
//   3. The browser's navigator.language.
//   4. "en".

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Locale =
  | "en"   // English
  | "hi"   // Hindi
  | "bn"   // Bengali
  | "ta"   // Tamil
  | "te"   // Telugu
  | "mr"   // Marathi
  | "gu"   // Gujarati
  | "kn"   // Kannada
  | "ml"   // Malayalam
  | "pa"   // Punjabi
  // Non-Indian (disabled in v1 — see `disabled: true` below):
  | "es"   // Spanish
  | "fr"   // French
  | "ar"   // Arabic
  | "pt"   // Portuguese
  | "id"   // Indonesian

export interface LocaleMeta {
  code: Locale
  /** Native label shown in the picker. Includes English in parens
   *  so a multilingual user can find their language quickly. */
  label: string
  flag: string
  /** Selectable today vs surfaced-but-disabled. Indian languages
   *  ship with real translations; others show as "Coming soon" so
   *  visitors know the roadmap. */
  disabled?: boolean
}

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  // ── Active (Indian languages — real translations below) ──────
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी (Hindi)", flag: "🇮🇳" },
  { code: "bn", label: "বাংলা (Bengali)", flag: "🇮🇳" },
  { code: "ta", label: "தமிழ் (Tamil)", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు (Telugu)", flag: "🇮🇳" },
  { code: "mr", label: "मराठी (Marathi)", flag: "🇮🇳" },
  { code: "gu", label: "ગુજરાતી (Gujarati)", flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)", flag: "🇮🇳" },
  { code: "ml", label: "മലയാളം (Malayalam)", flag: "🇮🇳" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)", flag: "🇮🇳" },
  // ── Coming soon (disabled in the picker) ─────────────────────
  { code: "es", label: "Español", flag: "🇪🇸", disabled: true },
  { code: "fr", label: "Français", flag: "🇫🇷", disabled: true },
  { code: "ar", label: "العربية", flag: "🇸🇦", disabled: true },
  { code: "pt", label: "Português", flag: "🇧🇷", disabled: true },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩", disabled: true },
]

/** Whether a locale is selectable in the picker today. */
export function isLocaleEnabled(code: Locale): boolean {
  const meta = SUPPORTED_LOCALES.find((l) => l.code === code)
  return !!meta && !meta.disabled
}

// Translation keys.
//
// Names are dot-delimited by surface area so it's obvious where a
// string lives. Keep the English copy in sync with what's on
// screen — when a copy edit lands, update the en dictionary first
// so the type-checker forces every other locale to follow.
export interface Dictionary {
  "header.home": string
  "header.courses": string
  "header.teachers": string
  "header.blog": string
  "header.shop": string
  "header.wallOfLove": string
  "header.signIn": string
  "header.enroll": string
  "header.language": string
  "footer.allRightsReserved": string

  "footer.poweredBy": string

  "auth.signIn.title": string
  "auth.signIn.email": string
  "auth.signIn.password": string
  "auth.signIn.forgot": string
  "auth.signIn.submit": string
  "auth.signIn.inviteHint": string

  "auth.forgot.title": string
  "auth.forgot.body": string
  "auth.forgot.submit": string
  "auth.forgot.sentTitle": string
  "auth.forgot.sentBody": string

  "courses.title": string
  "courses.subtitle": string
  "courses.search": string
  "courses.noMatch": string

  "shop.title": string
  "shop.subtitle": string

  "library.title": string
  "library.subtitle": string
  "library.empty": string
  "library.findYours": string

  "common.cancel": string
  "common.save": string
  "common.continue": string
  "common.backToHome": string

  // ─── Extended (optional) keys ─────────────────────────────────
  // New surfaces added after the initial launch. Keys are optional
  // so we can ship partial native coverage and let the runtime fall
  // back to English (already wired in `t()`). Add accurate
  // translations for the priority Indian languages first
  // (hi/bn/ta/te/mr) — everything else inherits English until a
  // native string lands.

  "home.heroHeadline"?: string
  "home.heroSub"?: string
  "home.ctaBrowse"?: string
  "home.ctaLogin"?: string
  "home.featuredCourses"?: string
  "home.featuredTeachers"?: string
  "home.testimonials"?: string
  "home.aboutTitle"?: string
  "home.contactTitle"?: string

  "courses.viewCourse"?: string
  "courses.enroll"?: string
  "courses.free"?: string
  "courses.startLearning"?: string
  "courses.lessonsCount"?: string
  "courses.duration"?: string
  "courses.level"?: string
  "courses.category"?: string

  "shop.viewProduct"?: string
  "shop.buyNow"?: string
  "shop.addToCart"?: string
  "shop.inStock"?: string
  "shop.outOfStock"?: string
  "shop.bestseller"?: string

  "library.continue"?: string
  "library.notEnrolled"?: string
  "library.completed"?: string

  "blog.readMore"?: string
  "blog.published"?: string
  "blog.byAuthor"?: string
  "blog.relatedPosts"?: string

  "wall.title"?: string
  "wall.subtitle"?: string
  "wall.shareYours"?: string

  "common.loading"?: string
  "common.error"?: string
  "common.tryAgain"?: string
  "common.search"?: string
  "common.viewAll"?: string
  "common.close"?: string
  "common.copy"?: string
  "common.copied"?: string
  "common.share"?: string
  "common.next"?: string
  "common.previous"?: string

  "footer.privacy"?: string
  "footer.terms"?: string
  "footer.contact"?: string
  "footer.support"?: string

  "auth.signIn.haveAccount"?: string
  "auth.signIn.welcomeBack"?: string
  "auth.signIn.wrongCreds"?: string
}

// ─── Active dictionaries — real Indian-language translations ─────

const en: Dictionary = {
  "header.home": "Home",
  "header.courses": "Courses",
  "header.teachers": "Teachers",
  "header.blog": "Blog",
  "header.shop": "Shop",
  "header.wallOfLove": "Wall of Love",
  "header.signIn": "Sign in",
  "header.enroll": "Enroll",
  "header.language": "Language",
  "footer.allRightsReserved": "All rights reserved.",
  "footer.poweredBy": "Powered by",
  "auth.signIn.title": "Sign in",
  "auth.signIn.email": "Email",
  "auth.signIn.password": "Password",
  "auth.signIn.forgot": "Forgot password?",
  "auth.signIn.submit": "Sign in",
  "auth.signIn.inviteHint": "New here? Workspace access is invite-only — ask your admin to send you one.",
  "auth.forgot.title": "Reset your password",
  "auth.forgot.body": "Type the email you sign in with. We'll send you a link to set a new password.",
  "auth.forgot.submit": "Send reset link",
  "auth.forgot.sentTitle": "Check your inbox",
  "auth.forgot.sentBody": "If your address has an account, we just sent a link to reset the password.",
  "courses.title": "Courses",
  "courses.subtitle": "Self-paced and live. Pick a topic, pick a teacher, get started.",
  "courses.search": "Search — typos OK",
  "courses.noMatch": "No courses match",
  "shop.title": "Shop",
  "shop.subtitle": "Courses, downloads, 1-on-1 sessions, webinars, memberships and more.",
  "library.title": "My library",
  "library.subtitle": "Every purchase tied to your account.",
  "library.empty": "Nothing here yet",
  "library.findYours": "Find your library",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.continue": "Continue",
  "common.backToHome": "Back to home",
  // Extended
  "home.heroHeadline": "Learn from teachers you'll actually remember.",
  "home.heroSub": "Live classes, cohort courses, and a community that finishes what it starts.",
  "home.ctaBrowse": "Browse courses",
  "home.ctaLogin": "Sign in",
  "home.featuredCourses": "Featured courses",
  "home.featuredTeachers": "Meet Your instructors",
  "home.testimonials": "What our students say",
  "home.aboutTitle": "About us",
  "home.contactTitle": "Get in touch",
  "courses.viewCourse": "View course",
  "courses.enroll": "Enroll now",
  "courses.free": "Free",
  "courses.startLearning": "Start learning",
  "courses.lessonsCount": "lessons",
  "courses.duration": "Duration",
  "courses.level": "Level",
  "courses.category": "Category",
  "shop.viewProduct": "View product",
  "shop.buyNow": "Buy now",
  "shop.addToCart": "Add to cart",
  "shop.inStock": "In stock",
  "shop.outOfStock": "Sold out",
  "shop.bestseller": "Bestseller",
  "library.continue": "Continue",
  "library.notEnrolled": "You haven't enrolled in anything yet.",
  "library.completed": "Completed",
  "blog.readMore": "Read more",
  "blog.published": "Published",
  "blog.byAuthor": "by",
  "blog.relatedPosts": "Related posts",
  "wall.title": "Wall of Love",
  "wall.subtitle": "Notes from students who finished what they started.",
  "wall.shareYours": "Share yours",
  "common.loading": "Loading…",
  "common.error": "Something went wrong",
  "common.tryAgain": "Try again",
  "common.search": "Search",
  "common.viewAll": "View all",
  "common.close": "Close",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.share": "Share",
  "common.next": "Next",
  "common.previous": "Previous",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.contact": "Contact",
  "footer.support": "Support",
  "auth.signIn.haveAccount": "Already have an account?",
  "auth.signIn.welcomeBack": "Welcome back",
  "auth.signIn.wrongCreds": "Wrong email or password.",
}

const hi: Dictionary = {
  "header.home": "होम",
  "header.courses": "कोर्सेज़",
  "header.teachers": "शिक्षक",
  "header.blog": "ब्लॉग",
  "header.shop": "स्टोर",
  "header.wallOfLove": "वॉल ऑफ़ लव",
  "header.signIn": "साइन इन",
  "header.enroll": "नामांकन",
  "header.language": "भाषा",
  "footer.poweredBy": "द्वारा संचालित",
  "footer.allRightsReserved": "सर्वाधिकार सुरक्षित।",
  "auth.signIn.title": "साइन इन करें",
  "auth.signIn.email": "ईमेल",
  "auth.signIn.password": "पासवर्ड",
  "auth.signIn.forgot": "पासवर्ड भूल गए?",
  "auth.signIn.submit": "साइन इन करें",
  "auth.signIn.inviteHint": "नए हैं? वर्कस्पेस का एक्सेस केवल इनवाइट से मिलता है — अपने एडमिन से इनवाइट लें।",
  "auth.forgot.title": "अपना पासवर्ड रीसेट करें",
  "auth.forgot.body": "वही ईमेल टाइप करें जिससे आप साइन इन करते हैं। हम नया पासवर्ड सेट करने का लिंक भेजेंगे।",
  "auth.forgot.submit": "रीसेट लिंक भेजें",
  "auth.forgot.sentTitle": "अपना इनबॉक्स देखें",
  "auth.forgot.sentBody": "अगर आपका ईमेल अकाउंट से जुड़ा है, तो हमने पासवर्ड रीसेट करने का लिंक भेज दिया है।",
  "courses.title": "कोर्सेज़",
  "courses.subtitle": "अपनी गति से या लाइव। एक विषय चुनें, एक टीचर चुनें, शुरुआत करें।",
  "courses.search": "खोजें — टाइपो ठीक हैं",
  "courses.noMatch": "कोई कोर्स नहीं मिला",
  "shop.title": "स्टोर",
  "shop.subtitle": "कोर्सेज़, डाउनलोड, 1-on-1 सेशन, वेबिनार, मेंबरशिप — सब कुछ।",
  "library.title": "मेरी लाइब्रेरी",
  "library.subtitle": "आपके अकाउंट से जुड़ी हर ख़रीदारी।",
  "library.empty": "अभी यहाँ कुछ नहीं है",
  "library.findYours": "अपनी लाइब्रेरी खोजें",
  "common.cancel": "रद्द करें",
  "common.save": "सेव करें",
  "common.continue": "जारी रखें",
  "common.backToHome": "होम पर वापस",
  "home.heroHeadline": "ऐसे शिक्षकों से सीखिए जिन्हें आप वाकई याद रखेंगे।",
  "home.heroSub": "लाइव क्लासेज़, कोहोर्ट कोर्स और एक ऐसा समुदाय जो शुरू की हुई बात पूरी करता है।",
  "home.ctaBrowse": "कोर्सेज़ देखें",
  "home.ctaLogin": "साइन इन",
  "home.featuredCourses": "फ़ीचर्ड कोर्सेज़",
  "home.featuredTeachers": "अपने शिक्षकों से मिलिए",
  "home.testimonials": "हमारे छात्र क्या कहते हैं",
  "home.aboutTitle": "हमारे बारे में",
  "home.contactTitle": "संपर्क करें",
  "courses.viewCourse": "कोर्स देखें",
  "courses.enroll": "अभी एनरोल करें",
  "courses.free": "मुफ़्त",
  "courses.startLearning": "सीखना शुरू करें",
  "courses.lessonsCount": "लेसन",
  "courses.duration": "अवधि",
  "courses.level": "स्तर",
  "courses.category": "श्रेणी",
  "shop.viewProduct": "प्रोडक्ट देखें",
  "shop.buyNow": "अभी ख़रीदें",
  "shop.addToCart": "कार्ट में जोड़ें",
  "shop.inStock": "उपलब्ध है",
  "shop.outOfStock": "उपलब्ध नहीं",
  "shop.bestseller": "बेस्टसेलर",
  "library.continue": "जारी रखें",
  "library.notEnrolled": "आपने अभी तक कुछ भी एनरोल नहीं किया है।",
  "library.completed": "पूरा हो गया",
  "blog.readMore": "और पढ़ें",
  "blog.published": "प्रकाशित",
  "blog.byAuthor": "द्वारा",
  "blog.relatedPosts": "संबंधित पोस्ट",
  "wall.title": "वॉल ऑफ़ लव",
  "wall.subtitle": "उन छात्रों के संदेश जिन्होंने जो शुरू किया उसे पूरा किया।",
  "wall.shareYours": "अपना साझा करें",
  "common.loading": "लोड हो रहा है…",
  "common.error": "कुछ ग़लत हो गया",
  "common.tryAgain": "फिर से कोशिश करें",
  "common.search": "खोजें",
  "common.viewAll": "सभी देखें",
  "common.close": "बंद करें",
  "common.copy": "कॉपी",
  "common.copied": "कॉपी हो गया",
  "common.share": "शेयर",
  "common.next": "अगला",
  "common.previous": "पिछला",
  "footer.privacy": "प्राइवेसी",
  "footer.terms": "शर्तें",
  "footer.contact": "संपर्क",
  "footer.support": "सहायता",
  "auth.signIn.haveAccount": "क्या आपका पहले से अकाउंट है?",
  "auth.signIn.welcomeBack": "वापस स्वागत है",
  "auth.signIn.wrongCreds": "ग़लत ईमेल या पासवर्ड।",
}

const bn: Dictionary = {
  "header.home": "হোম",
  "header.courses": "কোর্স",
  "header.teachers": "শিক্ষক",
  "header.blog": "ব্লগ",
  "header.shop": "শপ",
  "header.wallOfLove": "ওয়াল অফ লাভ",
  "header.signIn": "সাইন ইন",
  "header.enroll": "নথিভুক্ত",
  "footer.allRightsReserved": "সর্বস্বত্ব সংরক্ষিত।",
  "header.language": "ভাষা",
  "footer.poweredBy": "দ্বারা চালিত",
  "auth.signIn.title": "সাইন ইন করুন",
  "auth.signIn.email": "ইমেল",
  "auth.signIn.password": "পাসওয়ার্ড",
  "auth.signIn.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
  "auth.signIn.submit": "সাইন ইন",
  "auth.signIn.inviteHint": "নতুন? ওয়ার্কস্পেস অ্যাক্সেস শুধু আমন্ত্রণে — আপনার অ্যাডমিনের কাছ থেকে আমন্ত্রণ চান।",
  "auth.forgot.title": "পাসওয়ার্ড রিসেট করুন",
  "auth.forgot.body": "যে ইমেল দিয়ে সাইন ইন করেন সেটি লিখুন। নতুন পাসওয়ার্ড সেট করার লিঙ্ক পাঠাব।",
  "auth.forgot.submit": "রিসেট লিঙ্ক পাঠান",
  "auth.forgot.sentTitle": "আপনার ইনবক্স দেখুন",
  "auth.forgot.sentBody": "আপনার ঠিকানার সাথে যদি অ্যাকাউন্ট থাকে, পাসওয়ার্ড রিসেটের লিঙ্ক পাঠিয়েছি।",
  "courses.title": "কোর্স",
  "courses.subtitle": "নিজের গতিতে বা লাইভ। বিষয় বাছুন, শিক্ষক বাছুন, শুরু করুন।",
  "courses.search": "খুঁজুন — টাইপো ঠিক আছে",
  "courses.noMatch": "কোনো কোর্স মিলছে না",
  "shop.title": "শপ",
  "shop.subtitle": "কোর্স, ডাউনলোড, 1-on-1 সেশন, ওয়েবিনার, মেম্বারশিপ — সব কিছু।",
  "library.title": "আমার লাইব্রেরি",
  "library.subtitle": "আপনার অ্যাকাউন্টে যুক্ত প্রতিটি ক্রয়।",
  "library.empty": "এখানে এখনও কিছু নেই",
  "library.findYours": "আপনার লাইব্রেরি খুঁজুন",
  "common.cancel": "বাতিল",
  "common.save": "সেভ",
  "common.continue": "চালিয়ে যান",
  "common.backToHome": "হোমে ফিরুন",
  "home.heroHeadline": "এমন শিক্ষকদের কাছে শিখুন যাঁদের আপনি সত্যিই মনে রাখবেন।",
  "home.heroSub": "লাইভ ক্লাস, কোহর্ট কোর্স এবং এমন একটি সম্প্রদায় যা যা শুরু করে তা শেষ করে।",
  "home.ctaBrowse": "কোর্স দেখুন",
  "home.ctaLogin": "সাইন ইন",
  "home.featuredCourses": "নির্বাচিত কোর্স",
  "home.featuredTeachers": "শিক্ষকদের সাথে দেখা করুন",
  "home.testimonials": "শিক্ষার্থীরা কী বলে",
  "home.aboutTitle": "আমাদের সম্পর্কে",
  "home.contactTitle": "যোগাযোগ করুন",
  "courses.viewCourse": "কোর্স দেখুন",
  "courses.enroll": "এনরোল করুন",
  "courses.free": "ফ্রি",
  "courses.startLearning": "শেখা শুরু করুন",
  "courses.lessonsCount": "লেসন",
  "courses.duration": "সময়কাল",
  "courses.level": "স্তর",
  "courses.category": "ক্যাটেগরি",
  "shop.viewProduct": "প্রোডাক্ট দেখুন",
  "shop.buyNow": "এখন কিনুন",
  "shop.addToCart": "কার্টে যোগ করুন",
  "shop.inStock": "স্টকে আছে",
  "shop.outOfStock": "স্টকে নেই",
  "shop.bestseller": "বেস্টসেলার",
  "library.continue": "চালিয়ে যান",
  "library.notEnrolled": "আপনি এখনও কিছু এনরোল করেননি।",
  "library.completed": "সম্পন্ন",
  "blog.readMore": "আরও পড়ুন",
  "blog.published": "প্রকাশিত",
  "blog.byAuthor": "দ্বারা",
  "blog.relatedPosts": "সম্পর্কিত পোস্ট",
  "wall.title": "ভালোবাসার দেওয়াল",
  "wall.subtitle": "যাঁরা যা শুরু করেছিলেন তা শেষ করেছেন—তাঁদের কথা।",
  "wall.shareYours": "আপনার গল্প বলুন",
  "common.loading": "লোড হচ্ছে…",
  "common.error": "কিছু সমস্যা হয়েছে",
  "common.tryAgain": "আবার চেষ্টা করুন",
  "common.search": "খুঁজুন",
  "common.viewAll": "সব দেখুন",
  "common.close": "বন্ধ",
  "common.copy": "কপি",
  "common.copied": "কপি হয়েছে",
  "common.share": "শেয়ার",
  "common.next": "পরবর্তী",
  "common.previous": "পূর্ববর্তী",
  "footer.privacy": "প্রাইভেসি",
  "footer.terms": "শর্তাবলী",
  "footer.contact": "যোগাযোগ",
  "footer.support": "সহায়তা",
  "auth.signIn.haveAccount": "ইতিমধ্যেই অ্যাকাউন্ট আছে?",
  "auth.signIn.welcomeBack": "ফিরে আসার জন্য স্বাগতম",
  "auth.signIn.wrongCreds": "ভুল ইমেল বা পাসওয়ার্ড।",
}

const ta: Dictionary = {
  "header.home": "முகப்பு",
  "header.courses": "பாடங்கள்",
  "header.teachers": "ஆசிரியர்கள்",
  "header.blog": "வலைப்பதிவு",
  "header.shop": "கடை",
  "header.wallOfLove": "அன்பின் சுவர்",
  "header.signIn": "உள் நுழை",
  "header.enroll": "சேருங்கள்",
  "footer.allRightsReserved": "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
  "header.language": "மொழி",
  "footer.poweredBy": "மூலம் இயக்கப்படுகிறது",
  "auth.signIn.title": "உள் நுழைக",
  "auth.signIn.email": "மின்னஞ்சல்",
  "auth.signIn.password": "கடவுச்சொல்",
  "auth.signIn.forgot": "கடவுச்சொல் மறந்துவிட்டதா?",
  "auth.signIn.submit": "உள் நுழை",
  "auth.signIn.inviteHint": "புதியவரா? பணியிட அணுகல் அழைப்பின் மூலம் மட்டுமே — உங்கள் நிர்வாகியிடம் அழைப்பு கேளுங்கள்.",
  "auth.forgot.title": "கடவுச்சொல்லை மீட்டமை",
  "auth.forgot.body": "நீங்கள் உள் நுழையும் மின்னஞ்சலை உள்ளிடவும். புதிய கடவுச்சொல் அமைக்க இணைப்பு அனுப்புவோம்.",
  "auth.forgot.submit": "மீட்டமை இணைப்பு அனுப்பு",
  "auth.forgot.sentTitle": "உங்கள் இன்பாக்ஸைப் பாருங்கள்",
  "auth.forgot.sentBody": "உங்கள் முகவரியில் கணக்கு இருந்தால், கடவுச்சொல் மீட்டமை இணைப்பு அனுப்பப்பட்டுள்ளது.",
  "courses.title": "பாடங்கள்",
  "courses.subtitle": "சுய வேகத்திலும் நேரலையிலும். தலைப்பை தேர்ந்தெடு, ஆசிரியரை தேர்ந்தெடு, தொடங்கு.",
  "courses.search": "தேடு — எழுத்துப் பிழைகள் சரி",
  "courses.noMatch": "எந்த பாடமும் பொருந்தவில்லை",
  "shop.title": "கடை",
  "shop.subtitle": "பாடங்கள், பதிவிறக்கங்கள், 1-on-1 அமர்வுகள், வெபினார்கள், உறுப்பினர் பதிவுகள் — அனைத்தும்.",
  "library.title": "என் நூலகம்",
  "library.subtitle": "உங்கள் கணக்கோடு இணைக்கப்பட்ட ஒவ்வொரு கொள்முதலும்.",
  "library.empty": "இங்கே இன்னும் ஒன்றும் இல்லை",
  "library.findYours": "உங்கள் நூலகத்தை கண்டறி",
  "common.cancel": "ரத்து",
  "common.save": "சேமி",
  "common.continue": "தொடரு",
  "common.backToHome": "முகப்புக்குத் திரும்பு",
  "home.heroHeadline": "நீங்கள் உண்மையில் நினைவில் வைத்திருக்கும் ஆசிரியர்களிடம் கற்றுக்கொள்ளுங்கள்.",
  "home.heroSub": "லைவ் வகுப்புகள், கூட்டு படிப்புகள், மற்றும் ஆரம்பித்ததை முடிக்கும் சமூகம்.",
  "home.ctaBrowse": "படிப்புகளைப் பார்",
  "home.ctaLogin": "உள்நுழைய",
  "home.featuredCourses": "முக்கிய படிப்புகள்",
  "home.featuredTeachers": "உங்கள் ஆசிரியர்களைச் சந்திக்கவும்",
  "home.testimonials": "மாணவர்கள் என்ன சொல்கிறார்கள்",
  "home.aboutTitle": "எங்களைப் பற்றி",
  "home.contactTitle": "தொடர்பு கொள்ள",
  "courses.viewCourse": "படிப்பைப் பார்",
  "courses.enroll": "இப்போது சேரவும்",
  "courses.free": "இலவசம்",
  "courses.startLearning": "கற்க தொடங்கு",
  "courses.lessonsCount": "பாடங்கள்",
  "courses.duration": "காலம்",
  "courses.level": "நிலை",
  "courses.category": "வகை",
  "shop.viewProduct": "தயாரிப்பைப் பார்",
  "shop.buyNow": "இப்போது வாங்கு",
  "shop.addToCart": "கூடைக்கு சேர்",
  "shop.inStock": "கையிருப்பில் உள்ளது",
  "shop.outOfStock": "விற்றுத் தீர்ந்தது",
  "shop.bestseller": "சிறந்த விற்பனை",
  "library.continue": "தொடரவும்",
  "library.notEnrolled": "நீங்கள் இன்னும் எதிலும் சேரவில்லை.",
  "library.completed": "முடிந்தது",
  "blog.readMore": "மேலும் படிக்க",
  "blog.published": "வெளியிடப்பட்டது",
  "blog.byAuthor": "ஆல்",
  "blog.relatedPosts": "தொடர்புடைய பதிவுகள்",
  "wall.title": "அன்பின் சுவர்",
  "wall.subtitle": "தொடங்கியதை முடித்த மாணவர்களின் குறிப்புகள்.",
  "wall.shareYours": "உங்களுடையதைப் பகிரவும்",
  "common.loading": "ஏற்றுகிறது…",
  "common.error": "ஏதோ தவறு",
  "common.tryAgain": "மீண்டும் முயற்சி",
  "common.search": "தேடு",
  "common.viewAll": "எல்லாவற்றையும் பார்",
  "common.close": "மூடு",
  "common.copy": "நகலெடு",
  "common.copied": "நகலெடுக்கப்பட்டது",
  "common.share": "பகிர்",
  "common.next": "அடுத்து",
  "common.previous": "முந்தைய",
  "footer.privacy": "தனியுரிமை",
  "footer.terms": "விதிமுறைகள்",
  "footer.contact": "தொடர்பு",
  "footer.support": "ஆதரவு",
  "auth.signIn.haveAccount": "ஏற்கனவே கணக்கு உள்ளதா?",
  "auth.signIn.welcomeBack": "மீண்டும் வரவேற்கிறோம்",
  "auth.signIn.wrongCreds": "தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்.",
}

const te: Dictionary = {
  "header.home": "హోమ్",
  "header.courses": "కోర్సులు",
  "header.teachers": "ఉపాధ్యాయులు",
  "header.blog": "బ్లాగ్",
  "header.shop": "షాప్",
  "header.wallOfLove": "వాల్ ఆఫ్ లవ్",
  "header.signIn": "సైన్ ఇన్",
  "header.enroll": "నమోదు",
  "footer.allRightsReserved": "అన్ని హక్కులూ ప్రత్యేకించబడ్డాయి.",
  "header.language": "భాష",
  "footer.poweredBy": "ద్వారా అందించబడింది",
  "auth.signIn.title": "సైన్ ఇన్ చేయండి",
  "auth.signIn.email": "ఇమెయిల్",
  "auth.signIn.password": "పాస్‌వర్డ్",
  "auth.signIn.forgot": "పాస్‌వర్డ్ మర్చిపోయారా?",
  "auth.signIn.submit": "సైన్ ఇన్",
  "auth.signIn.inviteHint": "కొత్తవారా? వర్క్‌స్పేస్ యాక్సెస్ ఆహ్వానం ద్వారా మాత్రమే — మీ అడ్మిన్‌ని అడగండి.",
  "auth.forgot.title": "మీ పాస్‌వర్డ్‌ని రీసెట్ చేయండి",
  "auth.forgot.body": "మీరు సైన్ ఇన్ చేసే ఇమెయిల్‌ని టైప్ చేయండి. కొత్త పాస్‌వర్డ్ సెట్ చేసే లింక్ పంపుతాము.",
  "auth.forgot.submit": "రీసెట్ లింక్ పంపండి",
  "auth.forgot.sentTitle": "మీ ఇన్‌బాక్స్‌ని చూడండి",
  "auth.forgot.sentBody": "మీ చిరునామా ఖాతాతో ముడిపడి ఉంటే, పాస్‌వర్డ్ రీసెట్ లింక్ పంపాము.",
  "courses.title": "కోర్సులు",
  "courses.subtitle": "మీ వేగంలోనూ లైవ్‌లోనూ. ఒక అంశం ఎంచుకోండి, ఒక గురువు ఎంచుకోండి, ప్రారంభించండి.",
  "courses.search": "శోధించండి — టైపోలు సరే",
  "courses.noMatch": "ఏ కోర్సూ సరిపోలలేదు",
  "shop.title": "షాప్",
  "shop.subtitle": "కోర్సులు, డౌన్‌లోడ్‌లు, 1-on-1 సెషన్లు, వెబినార్లు, మెంబర్‌షిప్‌లు — అన్నీ.",
  "library.title": "నా లైబ్రరీ",
  "library.subtitle": "మీ ఖాతాతో ముడిపడిన ప్రతి కొనుగోలు.",
  "library.empty": "ఇంకా ఇక్కడ ఏమీ లేదు",
  "library.findYours": "మీ లైబ్రరీని కనుగొనండి",
  "common.cancel": "రద్దు",
  "common.save": "సేవ్",
  "common.continue": "కొనసాగించు",
  "common.backToHome": "హోమ్‌కి తిరిగి",
  "home.heroHeadline": "మీరు నిజంగా గుర్తుపెట్టుకునే ఉపాధ్యాయుల వద్ద నేర్చుకోండి.",
  "home.heroSub": "లైవ్ క్లాసులు, కోహార్ట్ కోర్సులు, మరియు ప్రారంభించినదాన్ని పూర్తి చేసే సమాజం.",
  "home.ctaBrowse": "కోర్సులు చూడండి",
  "home.ctaLogin": "సైన్ ఇన్",
  "home.featuredCourses": "ఎంపిక చేసిన కోర్సులు",
  "home.featuredTeachers": "మీ ఉపాధ్యాయులను కలవండి",
  "home.testimonials": "విద్యార్థులు ఏమి చెబుతారు",
  "home.aboutTitle": "మా గురించి",
  "home.contactTitle": "సంప్రదించండి",
  "courses.viewCourse": "కోర్సు చూడండి",
  "courses.enroll": "ఇప్పుడే చేరండి",
  "courses.free": "ఉచితం",
  "courses.startLearning": "నేర్చుకోవడం ప్రారంభించండి",
  "courses.lessonsCount": "పాఠాలు",
  "courses.duration": "వ్యవధి",
  "courses.level": "స్థాయి",
  "courses.category": "వర్గం",
  "shop.viewProduct": "ఉత్పత్తి చూడండి",
  "shop.buyNow": "ఇప్పుడే కొనండి",
  "shop.addToCart": "కార్ట్‌లో జోడించండి",
  "shop.inStock": "నిల్వలో ఉంది",
  "shop.outOfStock": "నిల్వలో లేదు",
  "shop.bestseller": "అత్యధికంగా అమ్ముడైనది",
  "library.continue": "కొనసాగించండి",
  "library.notEnrolled": "మీరు ఇంకా ఏదానిలోనూ చేరలేదు.",
  "library.completed": "పూర్తయింది",
  "blog.readMore": "మరింత చదవండి",
  "blog.published": "ప్రచురించబడింది",
  "blog.byAuthor": "ద్వారా",
  "blog.relatedPosts": "సంబంధిత పోస్ట్‌లు",
  "wall.title": "ప్రేమ గోడ",
  "wall.subtitle": "ప్రారంభించినదాన్ని పూర్తి చేసిన విద్యార్థుల నుండి సందేశాలు.",
  "wall.shareYours": "మీది పంచుకోండి",
  "common.loading": "లోడ్ అవుతోంది…",
  "common.error": "ఏదో తప్పు జరిగింది",
  "common.tryAgain": "మళ్ళీ ప్రయత్నించండి",
  "common.search": "శోధించండి",
  "common.viewAll": "అన్నీ చూడండి",
  "common.close": "మూసివేయండి",
  "common.copy": "కాపీ",
  "common.copied": "కాపీ చేయబడింది",
  "common.share": "షేర్",
  "common.next": "తదుపరి",
  "common.previous": "మునుపటి",
  "footer.privacy": "గోప్యత",
  "footer.terms": "నిబంధనలు",
  "footer.contact": "సంప్రదించు",
  "footer.support": "మద్దతు",
  "auth.signIn.haveAccount": "ఇప్పటికే ఖాతా ఉందా?",
  "auth.signIn.welcomeBack": "తిరిగి స్వాగతం",
  "auth.signIn.wrongCreds": "తప్పు ఇమెయిల్ లేదా పాస్‌వర్డ్.",
}

const mr: Dictionary = {
  "header.home": "होम",
  "header.courses": "कोर्सेस",
  "header.teachers": "शिक्षक",
  "header.blog": "ब्लॉग",
  "header.shop": "स्टोर",
  "header.wallOfLove": "वॉल ऑफ लव",
  "header.signIn": "साइन इन",
  "header.enroll": "नोंदणी करा",
  "header.language": "भाषा",
  "footer.poweredBy": "द्वारे चालविले",
  "footer.allRightsReserved": "सर्व हक्क राखीव.",
  "auth.signIn.title": "साइन इन करा",
  "auth.signIn.email": "ईमेल",
  "auth.signIn.password": "पासवर्ड",
  "auth.signIn.forgot": "पासवर्ड विसरलात?",
  "auth.signIn.submit": "साइन इन",
  "auth.signIn.inviteHint": "नवीन आहात? वर्कस्पेस अॅक्सेस फक्त आमंत्रणाने — तुमच्या अॅडमिनकडून आमंत्रण मागा.",
  "auth.forgot.title": "पासवर्ड रीसेट करा",
  "auth.forgot.body": "तुम्ही साइन इन करता तो ईमेल टाका. नवीन पासवर्ड सेट करण्यासाठी लिंक पाठवू.",
  "auth.forgot.submit": "रीसेट लिंक पाठवा",
  "auth.forgot.sentTitle": "तुमचा इनबॉक्स पाहा",
  "auth.forgot.sentBody": "तुमच्या पत्त्याला खाते असेल, तर पासवर्ड रीसेट करण्यासाठी लिंक पाठवली आहे.",
  "courses.title": "कोर्सेस",
  "courses.subtitle": "स्वतःच्या वेगात आणि लाइव्ह. विषय निवडा, शिक्षक निवडा, सुरुवात करा.",
  "courses.search": "शोधा — टायपो चालतील",
  "courses.noMatch": "कोणताही कोर्स जुळत नाही",
  "shop.title": "स्टोर",
  "shop.subtitle": "कोर्सेस, डाउनलोड्स, 1-on-1 सेशन्स, वेबिनार्स, मेंबरशिप्स — सर्व काही.",
  "library.title": "माझी लायब्ररी",
  "library.subtitle": "तुमच्या खात्याशी जोडलेली प्रत्येक खरेदी.",
  "library.empty": "इथे अजून काही नाही",
  "library.findYours": "तुमची लायब्ररी शोधा",
  "common.cancel": "रद्द करा",
  "common.save": "सेव्ह",
  "common.continue": "सुरू ठेवा",
  "common.backToHome": "होमवर परत",
  "home.heroHeadline": "तुम्हाला खरोखरच आठवतील अशा शिक्षकांकडून शिका.",
  "home.heroSub": "लाइव्ह वर्ग, कोहोर्ट कोर्सेस आणि सुरु केलेलं पूर्ण करणारा समुदाय.",
  "home.ctaBrowse": "कोर्सेस पहा",
  "home.ctaLogin": "साइन इन",
  "home.featuredCourses": "निवडक कोर्सेस",
  "home.featuredTeachers": "तुमच्या शिक्षकांना भेटा",
  "home.testimonials": "विद्यार्थी काय म्हणतात",
  "home.aboutTitle": "आमच्याबद्दल",
  "home.contactTitle": "संपर्क साधा",
  "courses.viewCourse": "कोर्स पहा",
  "courses.enroll": "आता नोंदणी करा",
  "courses.free": "मोफत",
  "courses.startLearning": "शिकायला सुरुवात करा",
  "courses.lessonsCount": "धडे",
  "courses.duration": "कालावधी",
  "courses.level": "स्तर",
  "courses.category": "श्रेणी",
  "shop.viewProduct": "उत्पादन पहा",
  "shop.buyNow": "आता खरेदी करा",
  "shop.addToCart": "कार्टमध्ये टाका",
  "shop.inStock": "उपलब्ध आहे",
  "shop.outOfStock": "उपलब्ध नाही",
  "shop.bestseller": "बेस्टसेलर",
  "library.continue": "सुरू ठेवा",
  "library.notEnrolled": "तुम्ही अजून कशातही नोंदणी केलेली नाही.",
  "library.completed": "पूर्ण",
  "blog.readMore": "अधिक वाचा",
  "blog.published": "प्रकाशित",
  "blog.byAuthor": "द्वारे",
  "blog.relatedPosts": "संबंधित पोस्ट",
  "wall.title": "प्रेमाची भिंत",
  "wall.subtitle": "ज्यांनी सुरू केलेलं पूर्ण केलं, अशा विद्यार्थ्यांकडून संदेश.",
  "wall.shareYours": "तुमचं शेअर करा",
  "common.loading": "लोड होत आहे…",
  "common.error": "काहीतरी चूक झाली",
  "common.tryAgain": "पुन्हा प्रयत्न करा",
  "common.search": "शोधा",
  "common.viewAll": "सर्व पहा",
  "common.close": "बंद करा",
  "common.copy": "कॉपी",
  "common.copied": "कॉपी झालं",
  "common.share": "शेअर",
  "common.next": "पुढील",
  "common.previous": "मागील",
  "footer.privacy": "गोपनीयता",
  "footer.terms": "अटी",
  "footer.contact": "संपर्क",
  "footer.support": "मदत",
  "auth.signIn.haveAccount": "आधीच खातं आहे?",
  "auth.signIn.welcomeBack": "पुन्हा स्वागत आहे",
  "auth.signIn.wrongCreds": "चुकीचा ईमेल किंवा पासवर्ड.",
}

const gu: Dictionary = {
  "header.home": "હોમ",
  "header.courses": "કોર્સ",
  "header.teachers": "શિક્ષકો",
  "header.blog": "બ્લોગ",
  "header.shop": "શોપ",
  "header.wallOfLove": "વોલ ઓફ લવ",
  "header.signIn": "સાઇન ઇન",
  "header.enroll": "નોંધણી",
  "footer.allRightsReserved": "બધા હક્કો અનામત છે.",
  "header.language": "ભાષા",
  "footer.poweredBy": "દ્વારા સંચાલિત",
  "auth.signIn.title": "સાઇન ઇન કરો",
  "auth.signIn.email": "ઇમેઇલ",
  "auth.signIn.password": "પાસવર્ડ",
  "auth.signIn.forgot": "પાસવર્ડ ભૂલી ગયા?",
  "auth.signIn.submit": "સાઇન ઇન",
  "auth.signIn.inviteHint": "નવા છો? વર્કસ્પેસ એક્સેસ માત્ર આમંત્રણથી — તમારા એડમિન પાસેથી આમંત્રણ માગો.",
  "auth.forgot.title": "પાસવર્ડ રીસેટ કરો",
  "auth.forgot.body": "તમે જે ઇમેઇલથી સાઇન ઇન કરો છો તે ટાઈપ કરો. નવો પાસવર્ડ સેટ કરવાની લિંક મોકલીશું.",
  "auth.forgot.submit": "રીસેટ લિંક મોકલો",
  "auth.forgot.sentTitle": "તમારું ઇનબોક્સ ચેક કરો",
  "auth.forgot.sentBody": "જો તમારા સરનામા સાથે ખાતું હશે, તો અમે પાસવર્ડ રીસેટની લિંક મોકલી છે.",
  "courses.title": "કોર્સ",
  "courses.subtitle": "તમારી ગતિએ અને લાઇવ. વિષય પસંદ કરો, શિક્ષક પસંદ કરો, શરૂ કરો.",
  "courses.search": "શોધો — ટાઇપો ઓકે",
  "courses.noMatch": "કોઈ કોર્સ મેળ ખાતો નથી",
  "shop.title": "શોપ",
  "shop.subtitle": "કોર્સ, ડાઉનલોડ, 1-on-1 સત્રો, વેબિનાર, મેમ્બરશિપ — બધું જ.",
  "library.title": "મારી લાઇબ્રેરી",
  "library.subtitle": "તમારા ખાતા સાથે જોડાયેલી દરેક ખરીદી.",
  "library.empty": "અહીં હજુ કંઈ નથી",
  "library.findYours": "તમારી લાઇબ્રેરી શોધો",
  "common.cancel": "રદ કરો",
  "common.save": "સેવ",
  "common.continue": "ચાલુ રાખો",
  "common.backToHome": "હોમ પર પાછા",
}

const kn: Dictionary = {
  "header.home": "ಮುಖಪುಟ",
  "header.courses": "ಕೋರ್ಸ್‌ಗಳು",
  "header.teachers": "ಶಿಕ್ಷಕರು",
  "header.blog": "ಬ್ಲಾಗ್",
  "header.shop": "ಶಾಪ್",
  "header.wallOfLove": "ವಾಲ್ ಆಫ್ ಲವ್",
  "header.signIn": "ಸೈನ್ ಇನ್",
  "header.enroll": "ನೋಂದಣಿ",
  "footer.allRightsReserved": "ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.",
  "header.language": "ಭಾಷೆ",
  "footer.poweredBy": "ರಿಂದ ಚಾಲಿತ",
  "auth.signIn.title": "ಸೈನ್ ಇನ್ ಮಾಡಿ",
  "auth.signIn.email": "ಇಮೇಲ್",
  "auth.signIn.password": "ಪಾಸ್‌ವರ್ಡ್",
  "auth.signIn.forgot": "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?",
  "auth.signIn.submit": "ಸೈನ್ ಇನ್",
  "auth.signIn.inviteHint": "ಹೊಸಬರೇ? ವರ್ಕ್‌ಸ್ಪೇಸ್ ಪ್ರವೇಶ ಆಮಂತ್ರಣ ಮಾತ್ರ — ನಿಮ್ಮ ಅಡ್ಮಿನ್‌ನಿಂದ ಆಮಂತ್ರಣ ಕೇಳಿ.",
  "auth.forgot.title": "ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ",
  "auth.forgot.body": "ನೀವು ಸೈನ್ ಇನ್ ಆಗುವ ಇಮೇಲ್ ಟೈಪ್ ಮಾಡಿ. ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸುತ್ತೇವೆ.",
  "auth.forgot.submit": "ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸಿ",
  "auth.forgot.sentTitle": "ನಿಮ್ಮ ಇನ್‌ಬಾಕ್ಸ್ ನೋಡಿ",
  "auth.forgot.sentBody": "ನಿಮ್ಮ ವಿಳಾಸಕ್ಕೆ ಖಾತೆ ಇದ್ದರೆ, ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸಿದ್ದೇವೆ.",
  "courses.title": "ಕೋರ್ಸ್‌ಗಳು",
  "courses.subtitle": "ನಿಮ್ಮ ವೇಗದಲ್ಲಿ ಮತ್ತು ಲೈವ್. ವಿಷಯ ಆಯ್ಕೆ ಮಾಡಿ, ಶಿಕ್ಷಕ ಆಯ್ಕೆ ಮಾಡಿ, ಪ್ರಾರಂಭಿಸಿ.",
  "courses.search": "ಹುಡುಕಿ — ಟೈಪೋ ಸರಿ",
  "courses.noMatch": "ಯಾವುದೇ ಕೋರ್ಸ್ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ",
  "shop.title": "ಶಾಪ್",
  "shop.subtitle": "ಕೋರ್ಸ್‌ಗಳು, ಡೌನ್‌ಲೋಡ್‌ಗಳು, 1-on-1 ಸೆಷನ್‌ಗಳು, ವೆಬಿನಾರ್‌ಗಳು, ಸದಸ್ಯತ್ವಗಳು — ಎಲ್ಲವೂ.",
  "library.title": "ನನ್ನ ಗ್ರಂಥಾಲಯ",
  "library.subtitle": "ನಿಮ್ಮ ಖಾತೆಗೆ ಲಿಂಕ್ ಮಾಡಿದ ಪ್ರತಿ ಖರೀದಿ.",
  "library.empty": "ಇಲ್ಲಿ ಇನ್ನೂ ಏನೂ ಇಲ್ಲ",
  "library.findYours": "ನಿಮ್ಮ ಗ್ರಂಥಾಲಯವನ್ನು ಹುಡುಕಿ",
  "common.cancel": "ರದ್ದು",
  "common.save": "ಉಳಿಸಿ",
  "common.continue": "ಮುಂದುವರಿಸಿ",
  "common.backToHome": "ಮುಖಪುಟಕ್ಕೆ ಹಿಂದಿರುಗಿ",
}

const ml: Dictionary = {
  "header.home": "ഹോം",
  "header.courses": "കോഴ്സുകൾ",
  "header.teachers": "അധ്യാപകർ",
  "header.blog": "ബ്ലോഗ്",
  "header.shop": "ഷോപ്പ്",
  "header.wallOfLove": "വാൾ ഓഫ് ലവ്",
  "header.signIn": "സൈൻ ഇൻ",
  "header.enroll": "ചേരുക",
  "footer.allRightsReserved": "എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.",
  "header.language": "ഭാഷ",
  "footer.poweredBy": "നൽകുന്നത്",
  "auth.signIn.title": "സൈൻ ഇൻ ചെയ്യുക",
  "auth.signIn.email": "ഇമെയിൽ",
  "auth.signIn.password": "പാസ്‌വേഡ്",
  "auth.signIn.forgot": "പാസ്‌വേഡ് മറന്നോ?",
  "auth.signIn.submit": "സൈൻ ഇൻ",
  "auth.signIn.inviteHint": "പുതിയതാണോ? വർക്സ്പേസ് ആക്സസ് ക്ഷണത്തിലൂടെ മാത്രം — നിങ്ങളുടെ അഡ്മിനോട് ക്ഷണം ചോദിക്കുക.",
  "auth.forgot.title": "നിങ്ങളുടെ പാസ്‌വേഡ് റീസെറ്റ് ചെയ്യുക",
  "auth.forgot.body": "നിങ്ങൾ സൈൻ ഇൻ ചെയ്യുന്ന ഇമെയിൽ ടൈപ്പ് ചെയ്യുക. പുതിയ പാസ്‌വേഡ് സജ്ജമാക്കാൻ ലിങ്ക് അയക്കും.",
  "auth.forgot.submit": "റീസെറ്റ് ലിങ്ക് അയക്കുക",
  "auth.forgot.sentTitle": "നിങ്ങളുടെ ഇൻബോക്സ് നോക്കുക",
  "auth.forgot.sentBody": "നിങ്ങളുടെ വിലാസത്തിന് അക്കൗണ്ടുണ്ടെങ്കിൽ, പാസ്‌വേഡ് റീസെറ്റ് ലിങ്ക് അയച്ചിട്ടുണ്ട്.",
  "courses.title": "കോഴ്സുകൾ",
  "courses.subtitle": "സ്വന്തം വേഗതയിലും ലൈവിലും. ഒരു വിഷയം തിരഞ്ഞെടുക്കുക, അധ്യാപകനെ തിരഞ്ഞെടുക്കുക, ആരംഭിക്കുക.",
  "courses.search": "തിരയുക — ടൈപ്പോ ഓക്കെ",
  "courses.noMatch": "ഒരു കോഴ്സും പൊരുത്തപ്പെടുന്നില്ല",
  "shop.title": "ഷോപ്പ്",
  "shop.subtitle": "കോഴ്സുകൾ, ഡൗൺലോഡുകൾ, 1-on-1 സെഷനുകൾ, വെബിനാറുകൾ, മെമ്പർഷിപ്പുകൾ — എല്ലാം.",
  "library.title": "എന്റെ ലൈബ്രറി",
  "library.subtitle": "നിങ്ങളുടെ അക്കൗണ്ടുമായി ബന്ധിപ്പിച്ച ഓരോ വാങ്ങലും.",
  "library.empty": "ഇവിടെ ഇതുവരെ ഒന്നുമില്ല",
  "library.findYours": "നിങ്ങളുടെ ലൈബ്രറി കണ്ടെത്തുക",
  "common.cancel": "റദ്ദാക്കുക",
  "common.save": "സേവ് ചെയ്യുക",
  "common.continue": "തുടരുക",
  "common.backToHome": "ഹോമിലേക്ക് മടങ്ങുക",
}

const pa: Dictionary = {
  "header.home": "ਘਰ",
  "header.courses": "ਕੋਰਸ",
  "header.teachers": "ਅਧਿਆਪਕ",
  "header.blog": "ਬਲੌਗ",
  "header.shop": "ਦੁਕਾਨ",
  "header.wallOfLove": "ਪਿਆਰ ਦੀ ਕੰਧ",
  "header.signIn": "ਸਾਈਨ ਇਨ",
  "header.enroll": "ਦਾਖਲਾ",
  "footer.allRightsReserved": "ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ ਹਨ।",
  "header.language": "ਭਾਸ਼ਾ",
  "footer.poweredBy": "ਦੁਆਰਾ ਸੰਚਾਲਿਤ",
  "auth.signIn.title": "ਸਾਈਨ ਇਨ ਕਰੋ",
  "auth.signIn.email": "ਈਮੇਲ",
  "auth.signIn.password": "ਪਾਸਵਰਡ",
  "auth.signIn.forgot": "ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?",
  "auth.signIn.submit": "ਸਾਈਨ ਇਨ",
  "auth.signIn.inviteHint": "ਨਵੇਂ ਹੋ? ਵਰਕਸਪੇਸ ਪਹੁੰਚ ਸਿਰਫ਼ ਸੱਦੇ ਨਾਲ — ਆਪਣੇ ਐਡਮਿਨ ਤੋਂ ਸੱਦਾ ਮੰਗੋ।",
  "auth.forgot.title": "ਆਪਣਾ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ",
  "auth.forgot.body": "ਉਹ ਈਮੇਲ ਟਾਈਪ ਕਰੋ ਜਿਸ ਨਾਲ ਤੁਸੀਂ ਸਾਈਨ ਇਨ ਕਰਦੇ ਹੋ। ਨਵਾਂ ਪਾਸਵਰਡ ਸੈੱਟ ਕਰਨ ਲਈ ਲਿੰਕ ਭੇਜਾਂਗੇ।",
  "auth.forgot.submit": "ਰੀਸੈੱਟ ਲਿੰਕ ਭੇਜੋ",
  "auth.forgot.sentTitle": "ਆਪਣਾ ਇਨਬਾਕਸ ਵੇਖੋ",
  "auth.forgot.sentBody": "ਜੇ ਤੁਹਾਡੇ ਪਤੇ ਨਾਲ ਖਾਤਾ ਜੁੜਿਆ ਹੈ, ਅਸੀਂ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਲਿੰਕ ਭੇਜ ਦਿੱਤਾ ਹੈ।",
  "courses.title": "ਕੋਰਸ",
  "courses.subtitle": "ਆਪਣੀ ਰਫ਼ਤਾਰ 'ਤੇ ਜਾਂ ਲਾਈਵ। ਵਿਸ਼ਾ ਚੁਣੋ, ਅਧਿਆਪਕ ਚੁਣੋ, ਸ਼ੁਰੂ ਕਰੋ।",
  "courses.search": "ਖੋਜੋ — ਟਾਈਪੋ ਠੀਕ",
  "courses.noMatch": "ਕੋਈ ਕੋਰਸ ਮੇਲ ਨਹੀਂ ਖਾਂਦਾ",
  "shop.title": "ਦੁਕਾਨ",
  "shop.subtitle": "ਕੋਰਸ, ਡਾਊਨਲੋਡ, 1-on-1 ਸੈਸ਼ਨ, ਵੈਬਿਨਾਰ, ਮੈਂਬਰਸ਼ਿਪ — ਸਭ ਕੁਝ।",
  "library.title": "ਮੇਰੀ ਲਾਇਬ੍ਰੇਰੀ",
  "library.subtitle": "ਤੁਹਾਡੇ ਖਾਤੇ ਨਾਲ ਜੁੜੀ ਹਰ ਖਰੀਦ।",
  "library.empty": "ਇੱਥੇ ਅਜੇ ਕੁਝ ਨਹੀਂ",
  "library.findYours": "ਆਪਣੀ ਲਾਇਬ੍ਰੇਰੀ ਲੱਭੋ",
  "common.cancel": "ਰੱਦ ਕਰੋ",
  "common.save": "ਸੇਵ",
  "common.continue": "ਜਾਰੀ ਰੱਖੋ",
  "common.backToHome": "ਘਰ ਵਾਪਸ",
}

// ─── "Coming soon" placeholder dictionaries ─────────────────────
// Listed in SUPPORTED_LOCALES with `disabled: true` so the picker
// shows them grayed-out. If a user somehow lands on one (deep link,
// stale persisted choice), strings fall back to English via the
// `t()` lookup — no crashes, just a slightly off experience until
// we ship real translations.
const es: Dictionary = en
const fr: Dictionary = en
const ar: Dictionary = en
const pt: Dictionary = en
const id: Dictionary = en

// Exported so the Languages admin page can render the full
// (key, source, translation) table side-by-side. Outside that one
// surface, consumers should go through `useT()` / `t()` instead of
// reading the dictionary directly.
export const DICTIONARIES: Record<Locale, Dictionary> = {
  en, hi, bn, ta, te, mr, gu, kn, ml, pa,
  es, fr, ar, pt, id,
}

const PORTAL_LOCALE_KEY = "thebigclass.portal.locale.v1"

interface I18nContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: keyof Dictionary) => string
  /** Tenant content translation. Looks up an admin-managed string
   *  under `overrides[locale][key]` with `fallback` as the default.
   *  Use this for anything the tenant configured themselves (page
   *  nav labels, CTA buttons, footer column headers, etc.) so each
   *  locale can have its own version without touching code. Key
   *  convention: `<surface>.<id>.<field>` (e.g. "page.home.navLabel",
   *  "nav.primaryCta.label", "footer.column.0.title"). */
  tenantT: (key: string, fallback: string) => string
  /** Mirrors PortalI18nConfig.multilingualEnabled. The LanguagePicker
   *  reads this to hide itself; consumers can render a single-language
   *  layout when false. */
  multilingualEnabled: boolean
  /** Tenant-enabled locales (subset of SUPPORTED_LOCALES). Undefined
   *  means "all ready locales" — the picker should default-list them. */
  enabledLocales?: Locale[]
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export interface I18nProviderProps {
  children: ReactNode
  /** Locale rendered on first paint. Overridden by the visitor's
   *  persisted choice when one exists and is still enabled. */
  defaultLocale?: Locale
  /** Subset of locales the tenant has enabled. Defaults to every
   *  ready locale from SUPPORTED_LOCALES. When the visitor's stored
   *  locale isn't in this list (admin disabled it after the visit),
   *  we fall back to defaultLocale. */
  enabledLocales?: Locale[]
  /** Master switch from the tenant settings. When false the picker
   *  hides itself and setLocale is a no-op, so the portal renders in
   *  `defaultLocale` only. */
  multilingualEnabled?: boolean
  /** Per-locale string overrides. Tenant-managed via the Languages
   *  admin page. Merged on top of the built-in dictionaries — keep
   *  the dictionary key as-is, supply just the keys you want to
   *  customise. */
  overrides?: Partial<Record<Locale, Partial<Dictionary>>>
}

export function I18nProvider({
  children,
  defaultLocale = "en",
  enabledLocales,
  multilingualEnabled = true,
  overrides,
}: I18nProviderProps) {
  // Tenant-config-aware "is locale X reachable?" check. Layers the
  // built-in `disabled: true` flag with the per-tenant allow-list so
  // a disabled-by-tenant locale isn't selectable even if it shipped
  // a dictionary.
  const tenantAllows = useCallback(
    (code: Locale): boolean => {
      if (!isLocaleEnabled(code)) return false
      if (!enabledLocales || enabledLocales.length === 0) return true
      return enabledLocales.includes(code)
    },
    [enabledLocales],
  )

  // Initial state runs once; we hydrate from localStorage in an
  // effect so SSR stays deterministic. The tiny flash is worth
  // the predictability — a Suspense-y wait for localStorage
  // before painting would block first paint for everyone.
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    // Multilingual switched off: pin the locale to the tenant
    // default and ignore any visitor-side persistence.
    if (!multilingualEnabled) {
      setLocaleState(defaultLocale)
      return
    }
    try {
      const stored = window.localStorage.getItem(PORTAL_LOCALE_KEY)
      if (stored && (DICTIONARIES as Record<string, unknown>)[stored]) {
        if (tenantAllows(stored as Locale)) {
          setLocaleState(stored as Locale)
          return
        }
      }
    } catch {
      /* ignore */
    }
    // Last resort: sniff navigator.language. We only honor the
    // primary subtag ("hi-IN" → "hi") since region variants don't
    // change which dictionary applies.
    const navLang = (typeof navigator !== "undefined" ? navigator.language : "")
      .toLowerCase()
      .split("-")[0] as Locale
    if (DICTIONARIES[navLang] && tenantAllows(navLang)) {
      setLocaleState(navLang)
      return
    }
    setLocaleState(defaultLocale)
  }, [multilingualEnabled, defaultLocale, tenantAllows])

  const setLocale = useCallback((next: Locale) => {
    // Refuse to switch when multilingual is off, or when the locale
    // isn't allowed by the tenant. The picker hides itself in both
    // cases; this is defence-in-depth for programmatic callers.
    if (!multilingualEnabled) return
    if (!tenantAllows(next)) return
    setLocaleState(next)
    try {
      window.localStorage.setItem(PORTAL_LOCALE_KEY, next)
    } catch {
      /* ignore */
    }
    // Reflect on <html> so any future CSS hooks (e.g. font-stack
    // overrides per locale) can target it without React state.
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", next)
    }
  }, [multilingualEnabled, tenantAllows])

  const t = useCallback(
    (key: keyof Dictionary) => {
      const override = overrides?.[locale]?.[key]
      if (typeof override === "string" && override.length > 0) return override
      return DICTIONARIES[locale][key] ?? DICTIONARIES.en[key] ?? key
    },
    [locale, overrides],
  )

  // Tenant-content translation. Same overrides map, but the key is a
  // free-form string that doesn't have to be in the typed Dictionary.
  // The caller passes a sensible fallback (the existing English
  // source value the tenant configured), so missing overrides simply
  // render the original text — exactly what we want.
  const tenantT = useCallback(
    (key: string, fallback: string): string => {
      const localeOverrides = (overrides as Record<string, Record<string, string>> | undefined)?.[locale]
      const val = localeOverrides?.[key]
      if (typeof val === "string" && val.length > 0) return val
      return fallback
    },
    [locale, overrides],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, tenantT, multilingualEnabled, enabledLocales }),
    [locale, setLocale, t, tenantT, multilingualEnabled, enabledLocales],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext)
  // Falling back to English when the provider isn't mounted lets
  // shared components (used inside + outside the tenant portal)
  // render without crashing. The dashboard side doesn't mount the
  // provider; calls return English untouched.
  if (!ctx) {
    return {
      locale: "en",
      setLocale: () => {},
      t: (key) => DICTIONARIES.en[key] ?? key,
      tenantT: (_, fallback) => fallback,
      multilingualEnabled: false,
      enabledLocales: undefined,
    }
  }
  return ctx
}
