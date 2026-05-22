// Course category taxonomy.
//
// Single source of truth shared by the new-course form, the edit-course
// form, the public catalogue filters, and (eventually) marketplace SEO
// pages. Grouped by audience/segment so the combobox picker can render a
// scannable hierarchy instead of a flat 100-item list.
//
// Scope: nursery school to working professionals. The list deliberately
// covers every kind of teacher we expect on the platform — preschool
// teachers, school subject teachers, test-prep coaches, college lecturers,
// language tutors, music/dance instructors, vocational trainers, corporate
// L&D, and the usual tech/business/marketing creators. When unsure, lean
// toward including a category — empty groups feel worse than a long list,
// and the combobox's search makes long lists cheap.
//
// Adding a category? Just append to the relevant group. Adding a group?
// Append a new entry to CATEGORY_GROUPS. Nothing else needs to change.

export interface CategoryGroup {
  // Label shown above the items in the picker — keep short.
  group: string
  // Single-line description shown on hover / under the label in the picker.
  description?: string
  items: string[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: "Early Childhood (Ages 0–6)",
    description: "Pre-school and play-based learning.",
    items: [
      "Nursery & Preschool",
      "Phonics & Early Reading",
      "Numbers & Early Math",
      "Storytime & Rhymes",
      "Sensory & Play-Based Learning",
      "Toddler Activities",
    ],
  },
  {
    group: "Primary School (Grades 1–5)",
    items: [
      "English – Primary",
      "Mathematics – Primary",
      "Science – Primary",
      "Social Studies – Primary",
      "Environmental Studies (EVS)",
      "General Knowledge",
      "Handwriting & Cursive",
    ],
  },
  {
    group: "Middle School (Grades 6–8)",
    items: [
      "English – Middle School",
      "Mathematics – Middle School",
      "Science – Middle School",
      "Social Studies – Middle School",
      "Hindi / Regional Language",
      "Computer Basics",
    ],
  },
  {
    group: "High School (Grades 9–12)",
    items: [
      "Mathematics – High School",
      "Physics",
      "Chemistry",
      "Biology",
      "English – High School",
      "History",
      "Geography",
      "Economics",
      "Political Science",
      "Business Studies",
      "Accountancy",
      "Computer Science – High School",
    ],
  },
  {
    group: "Test Preparation",
    description: "Competitive and standardised exams.",
    items: [
      "JEE (Main + Advanced)",
      "NEET",
      "UPSC / Civil Services",
      "SSC / Banking",
      "CAT / MBA Entrance",
      "GATE",
      "CLAT (Law)",
      "CA / CMA / CS",
      "IELTS / TOEFL",
      "SAT / ACT",
      "GRE / GMAT",
      "State Board Exams",
      "Olympiad Prep",
      "NDA / Defence Exams",
    ],
  },
  {
    group: "Higher Education",
    items: [
      "Engineering",
      "Medical Sciences",
      "Commerce",
      "Humanities",
      "Pure Sciences",
      "Architecture",
      "Law",
    ],
  },
  {
    group: "Languages",
    items: [
      "English Speaking",
      "Hindi",
      "Spanish",
      "French",
      "German",
      "Japanese",
      "Mandarin",
      "Arabic",
      "Sanskrit",
      "Indian Regional Languages",
      "Sign Language",
    ],
  },
  {
    group: "Tech & Programming",
    items: [
      "Web Development",
      "Mobile Development",
      "Game Development",
      "Programming Fundamentals",
      "DevOps & Cloud",
      "Cybersecurity",
      "Blockchain & Web3",
      "IoT & Robotics",
    ],
  },
  {
    group: "Data & AI",
    items: [
      "Data Science",
      "Machine Learning",
      "Artificial Intelligence",
      "Data Analytics",
      "Statistics",
      "Big Data",
    ],
  },
  {
    group: "Design",
    items: [
      "Graphic Design",
      "UI / UX",
      "Product Design",
      "Motion Graphics",
      "3D & Animation",
      "Architecture & CAD",
    ],
  },
  {
    group: "Business & Management",
    items: [
      "Entrepreneurship",
      "Leadership & Management",
      "Strategy",
      "HR & Recruiting",
      "Operations",
      "Sales",
    ],
  },
  {
    group: "Marketing",
    items: [
      "Digital Marketing",
      "SEO",
      "Social Media Marketing",
      "Content Marketing",
      "Email Marketing",
      "Performance Marketing",
      "Brand Marketing",
    ],
  },
  {
    group: "Finance & Investing",
    items: [
      "Personal Finance",
      "Stock Market",
      "Cryptocurrency",
      "Accounting",
      "Taxation",
      "Financial Planning",
    ],
  },
  {
    group: "Productivity & Software",
    items: [
      "Microsoft Excel",
      "Microsoft Word",
      "PowerPoint & Presentations",
      "Google Workspace",
      "Notion & Productivity Tools",
      "Project Management",
    ],
  },
  {
    group: "Arts & Crafts",
    items: [
      "Drawing & Sketching",
      "Painting",
      "Calligraphy",
      "Pottery & Ceramics",
      "DIY & Craft",
    ],
  },
  {
    group: "Music & Performing Arts",
    items: [
      "Vocals & Singing",
      "Guitar",
      "Piano / Keyboard",
      "Indian Classical Music",
      "Western Classical Music",
      "Music Production",
      "Dance",
      "Theatre & Drama",
    ],
  },
  {
    group: "Health & Wellness",
    items: [
      "Yoga",
      "Meditation & Mindfulness",
      "Nutrition",
      "Mental Health",
      "Fitness Training",
    ],
  },
  {
    group: "Sports & Recreation",
    items: [
      "Cricket",
      "Football",
      "Chess",
      "Swimming",
      "Martial Arts",
      "Athletics",
    ],
  },
  {
    group: "Personal Development",
    items: [
      "Public Speaking",
      "Communication Skills",
      "Soft Skills",
      "Time Management",
      "Career Coaching",
      "Interview Preparation",
    ],
  },
  {
    group: "Trades & Vocational",
    items: [
      "Cooking & Culinary",
      "Baking",
      "Photography",
      "Videography & Film",
      "Tailoring & Fashion",
      "Mechanical Trades",
      "Electrical Trades",
      "Automotive",
    ],
  },
  {
    group: "Hobbies & Lifestyle",
    items: [
      "Gardening",
      "Travel & Tourism",
      "Beauty & Makeup",
      "Pet Care",
      "Astrology",
      "Magic & Illusion",
    ],
  },
  {
    group: "Other",
    items: ["Custom / Other"],
  },
]

// Flat list for callers that just need every category id (filter dropdowns,
// validators, autocomplete elsewhere). Order matches CATEGORY_GROUPS so
// related categories cluster together.
export const ALL_CATEGORIES: string[] = CATEGORY_GROUPS.flatMap((g) => g.items)

export function findCategoryGroup(category: string): string | undefined {
  return CATEGORY_GROUPS.find((g) => g.items.includes(category))?.group
}

// Optional per-category tag hints — surfaced in the TagsInput so teachers
// get useful suggestions without having to brainstorm. Not exhaustive;
// categories without an entry just show no suggestions, which is fine.
export const CATEGORY_TAG_SUGGESTIONS: Record<string, string[]> = {
  "Web Development":  ["javascript", "react", "node", "typescript", "css", "fullstack", "nextjs"],
  "Mobile Development": ["react-native", "flutter", "ios", "android", "swift", "kotlin"],
  "Data Science":     ["python", "pandas", "numpy", "sql", "tableau", "powerbi"],
  "Machine Learning": ["python", "scikit-learn", "tensorflow", "pytorch", "nlp"],
  "Artificial Intelligence": ["llm", "gpt", "prompt-engineering", "agents", "ai"],
  "Graphic Design":   ["photoshop", "illustrator", "branding", "typography", "color"],
  "UI / UX":          ["figma", "wireframing", "prototyping", "user-research", "accessibility"],
  "Digital Marketing": ["seo", "google-ads", "meta-ads", "analytics", "funnels"],
  "SEO":              ["on-page", "off-page", "keyword-research", "backlinks", "technical-seo"],
  "Stock Market":     ["technical-analysis", "fundamentals", "options", "intraday", "swing"],
  "Yoga":             ["asana", "pranayama", "beginners", "meditation", "wellness"],
  "Guitar":           ["acoustic", "electric", "chords", "fingerstyle", "beginners"],
  "Photography":      ["portrait", "lightroom", "composition", "wedding", "product"],
  "JEE (Main + Advanced)": ["physics", "chemistry", "mathematics", "ncert", "mock-tests"],
  "NEET":             ["biology", "physics", "chemistry", "ncert", "mock-tests"],
  "UPSC / Civil Services": ["prelims", "mains", "csat", "current-affairs", "optional"],
  "IELTS / TOEFL":    ["speaking", "writing", "listening", "reading", "vocabulary"],
  "Microsoft Excel":  ["formulas", "pivot-tables", "vba", "dashboards", "data-analysis"],
  "Public Speaking":  ["presentation", "storytelling", "confidence", "body-language"],
  "Cooking & Culinary": ["baking", "indian", "italian", "vegetarian", "knife-skills"],
}
