/**
 * Projects shown on /my-works. Language shares are the percentage of source
 * bytes per language in each repository (dependencies, build output and
 * minified bundles excluded), rounded to one decimal. Languages under 1% are
 * folded into "Other".
 */
export type Work = {
  slug: string;
  name: string;
  kind: string;
  year: number;
  summary: string;
  highlights: string[];
  stack: string[];
  languages: Record<string, number>;
};

/** GitHub's language colours, with PowerShell lightened to read on graphite. */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  CSS: "#663399",
  PHP: "#4f5d95",
  Python: "#3572a5",
  PLpgSQL: "#336790",
  PowerShell: "#5391fe",
  Other: "#75726c",
};

export const WORKS: Work[] = [
  {
    slug: "orvann-web",
    name: "ORVANN",
    kind: "Agency website",
    year: 2026,
    summary:
      "The bilingual website of ORVANN, a software development and digital marketing agency. English and Arabic versions of every page, exported as static HTML for shared hosting.",
    highlights: [
      "Five service areas, each with its own page, deliverables and FAQ",
      "18 case studies, filterable by service",
      "Company profile and publications as flipbooks",
      "Start a Project form that pre-selects the service you came from",
    ],
    stack: ["Next.js 16", "React 19", "CSS Modules", "GSAP", "Lenis"],
    languages: { TypeScript: 62.4, HTML: 19.3, CSS: 13.8, JavaScript: 3.0, PHP: 1.3, Other: 0.2 },
  },
  {
    slug: "west-ngg",
    name: "WEST NGG",
    kind: "Real-estate company website",
    year: 2026,
    summary:
      "An Arabic (right-to-left) website for WEST NGG / Nabil Ghabrial Group, presenting the group, its companies and its projects in West Cairo.",
    highlights: [
      "A page per project plus a side-by-side comparison table",
      "Investor guide with buying steps and FAQs",
      "Built by a small Node generator into plain HTML, with no runtime framework or dependencies",
      "Automatic checks for broken links, missing alt text and accessibility issues",
    ],
    stack: ["Node.js static generator", "Vanilla JS", "WebP images"],
    languages: { JavaScript: 70.1, CSS: 29.2, Other: 0.7 },
  },
  {
    slug: "bidayah",
    name: "Bidayah (بداية)",
    kind: "Service website",
    year: 2026,
    summary:
      "An Arabic RTL website for a confidential marriage-introduction service: home, about and contact pages, and a guided application.",
    highlights: [
      "Eight-step application form with terms and consent",
      "Pages pre-rendered so content shows before JavaScript loads",
      "Design tokens for colours, type, spacing and motion",
      "One-command FTP deploy that uploads only changed files",
    ],
    stack: ["React 19", "Vite", "Tajawal font"],
    languages: { TypeScript: 68.3, CSS: 24.6, PowerShell: 3.5, HTML: 3.2, Other: 0.4 },
  },
  {
    slug: "orvann-crm",
    name: "ORVANN CRM",
    kind: "CRM and lead form",
    year: 2026,
    summary:
      "A customer sign-up form whose leads land straight in a CRM dashboard, sorted by region, governorate, position, priority and status.",
    highlights: [
      "Runs on ordinary shared hosting with a single-file database",
      "Admin dashboard for following up leads",
      "Deploy script that uploads over SSH, then verifies the live site",
    ],
    stack: ["PHP", "SQLite", "Vanilla JS"],
    languages: { PHP: 45.0, JavaScript: 30.4, CSS: 10.8, HTML: 9.3, PowerShell: 4.5 },
  },
  {
    slug: "orvann-assets",
    name: "ORVANN Assets",
    kind: "Media library",
    year: 2026,
    summary:
      "A private media library for a website's images, videos and documents, with folders, metadata, copyable URLs and embed code.",
    highlights: [
      "Large files upload directly from the browser to object storage",
      "Trash with restore and permanent delete",
      "Works offline as an installable web app",
    ],
    stack: ["Node.js", "PostgreSQL (Neon)", "Backblaze B2 / S3"],
    languages: { JavaScript: 85.5, CSS: 11.8, PLpgSQL: 1.5, HTML: 1.2 },
  },
  {
    slug: "kbc-workspace",
    name: "Kent Business College Workspace",
    kind: "Sales and admissions system",
    year: 2026,
    summary:
      "An internal workspace for a college's admissions and sales team: leads, applications, email queue, events and dashboards in one place.",
    highlights: [
      "Gmail, Eventbrite and Zoho integrations",
      "PDF application document templates",
      "Runs on PostgreSQL or MongoDB",
    ],
    stack: ["Node.js", "NestJS", "React", "PostgreSQL"],
    languages: { JavaScript: 55.5, TypeScript: 38.0, CSS: 5.2, PLpgSQL: 1.0, Other: 0.3 },
  },
  {
    slug: "creative-ops",
    name: "Creative Ops",
    kind: "AI platform",
    year: 2026,
    summary:
      "An AI-powered creative department: turn a one-line campaign idea into a brief, creative concepts and generated visuals, then review and approve them.",
    highlights: [
      "Idea → brief → concepts → images → AI quality review → human approval",
      "Edit with AI or hand off to Canva",
      "Multi-team workspaces kept separate at the database level",
    ],
    stack: ["Next.js 16", "Supabase", "OpenAI", "Tailwind CSS", "shadcn/ui"],
    languages: { TypeScript: 83.1, PLpgSQL: 16.3, Other: 0.6 },
  },
  {
    slug: "estateiq",
    name: "EstateIQ",
    kind: "Real-estate ERP (SaaS)",
    year: 2026,
    summary:
      "A multi-company ERP for real-estate developers that covers the whole sale, from the first lead to the last installment.",
    highlights: [
      "CRM with lead follow-ups and campaigns",
      "Inventory of projects, buildings and units, with reservations",
      "Sales, payment plans, installments and multi-currency finance",
      "Roles and permissions, audit log, automations and AI insights",
    ],
    stack: ["Next.js", "Prisma", "PostgreSQL", "NextAuth", "Radix UI"],
    languages: { TypeScript: 81.2, PLpgSQL: 16.8, CSS: 1.7, Other: 0.3 },
  },
  {
    slug: "apprenticeships-reviews",
    name: "Apprenticeships Reviews",
    kind: "Review platform",
    year: 2026,
    summary:
      "A review site for UK apprenticeship providers, where learners rate providers and visitors compare them before choosing.",
    highlights: [
      "Provider profiles, reviews, top-rated lists and side-by-side comparison",
      "Providers can claim their page and manage it from their own dashboard",
      "AI chatbot assistant for visitors",
    ],
    stack: ["React", "Vite", "Django", "PostgreSQL", "OpenAI"],
    languages: { TypeScript: 77.6, Python: 20.9, CSS: 0.8, Other: 0.7 },
  },
  {
    slug: "framevault",
    name: "FRAMEVAULT",
    kind: "Digital product store",
    year: 2026,
    summary:
      "This store: website templates, UI components and AI prompts that visitors preview live, buy, then copy or download.",
    highlights: [
      "Live sandboxed previews of every product",
      "Stripe checkout and versioned downloads",
      "Admin area for uploading and publishing products",
    ],
    stack: ["Next.js 16", "React 19", "Drizzle ORM", "Better Auth", "Stripe"],
    languages: { TypeScript: 84.2, HTML: 6.1, JavaScript: 5.5, CSS: 2.6, PLpgSQL: 1.6 },
  },
];
