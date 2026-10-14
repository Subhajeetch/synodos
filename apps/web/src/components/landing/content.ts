import {
  BookOpen,
  ClipboardList,
  Code,
  FileText,
  History,
  Image as ImageIcon,
  ListChecks,
  MessageSquare,
  Table,
  Type,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Brand                                                                      */
/* -------------------------------------------------------------------------- */

export const APP_NAME = "Synodos";
export const APP_DOMAIN = "synodos.pages.dev/";

/* -------------------------------------------------------------------------- */
/* Every link target on the page lives here. Swap "#" for real routes later.  */
/* -------------------------------------------------------------------------- */

export const LINKS = {
  home: "/",
  login: "/login",
  tryFree: "/signup",
  watchVideo: "#",
  seeHow: "#",
  readDocs: "#",
  share: "#",
  blog: "/blogs",
  realtimeEditing: "#",
  richText: "#",
  commentsMentions: "#",
  versionHistory: "#",
  teamWikis: "#",
  meetingNotes: "#",
  productSpecs: "#",
  contentTeams: "#",
  documentation: "#",
  guides: "#",
  careers: "#",
  privacy: "#",
  twitter: "#",
  discord: "#",
  linkedin: "#",
  overview: "#",
  roadmap: "#",
  bookDemo: "#",
  github: "#",
  contact: "#",
} as const;

/* -------------------------------------------------------------------------- */
/* Images (all files live in /public/images)                                  */
/* "gradiant" is spelled that way on purpose: it matches the file names.      */
/* -------------------------------------------------------------------------- */

export const IMAGES = {
  gradients: {
    quickStart: "/images/gradiant-1.png", // lavender/purple + coral glow, corner baked in at top-RIGHT
    hero: "/images/gradiant-2.webp", // warm orange/pink/purple/blue wash
    announce: "/images/gradiant-3.webp", // soft blue/lavender card background
    cta: "/images/gradiant-4.png", // purple/pink, behind final CTA + footer
    dark: "/images/dark-gradiant.webp",
  },
  hero: "/images/hero-image.webp", // main editor screenshot, 16:10
  announce: "/images/announcement-image.webp", // small floating UI mock, 4:3
  darkmodeEditor: "/images/darkmode-editor.webp", // dark editor screenshot, ~16:9
  darkmodeCard: "/images/darkmode-card.webp", // floating light card, ~10:7
  team: [
    "/images/ask-to-join.webp",
    "/images/version-history.png",
    "/images/users-snapshot.png",
  ], // each 16:10
  quickStart: "/images/new-document.png", // editor inside browser, 16:10
  templates: "/images/templates-preview.png", // template/doc preview, 3:2
};

export interface ImageSpec {
  width: number;
  height: number;
  /** CSS aspect-ratio value for the wrapper box. */
  ratio: string;
}

/** Intrinsic sizes used for width/height attributes and the placeholder box. */
export const IMAGE_SPECS = {
  hero: { width: 1600, height: 1000, ratio: "16 / 10" },
  announce: { width: 800, height: 500, ratio: "4 / 3" },
  darkmodeEditor: { width: 1600, height: 900, ratio: "16 / 9" },
  darkmodeCard: { width: 1000, height: 700, ratio: "10 / 7" },
  team: { width: 1600, height: 1000, ratio: "16 / 10" },
  quickStart: { width: 1600, height: 1000, ratio: "16 / 8" },
  templates: { width: 1500, height: 1000, ratio: "3 / 2" },
} satisfies Record<string, ImageSpec>;

/* -------------------------------------------------------------------------- */
/* Collaborators                                                              */
/* -------------------------------------------------------------------------- */

export const PALETTE = [
  "#F97362",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#3B82F6",
  "#14B8A6",
  "#22C55E",
] as const;

export interface Collaborator {
  name: string;
  color: string;
  src: string;
}

const COLLABORATOR_NAMES = [
  "Juliette",
  "Mason",
  "Patricia",
  "Laurence",
  "Kingsley",
  "Melissa",
  "May-Li",
  "Richard",
  "Davidson",
  "Sung-Ji",
  "Luciana",
  "Miles",
] as const;

function collaboratorAvatarUrl(name: string) {
  let hash = 0;
  for (const character of name) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  }
  return `https://i.pravatar.cc/80?img=${(hash % 70) + 1}`;
}

export const COLLABORATORS: readonly Collaborator[] = COLLABORATOR_NAMES.map(
  (name, i) => ({
    name,
    color: PALETTE[i % PALETTE.length] ?? PALETTE[0],
    src: collaboratorAvatarUrl(name),
  }),
);

/** First three collaborators, shown as an overlapping avatar stack. */
export const AVATAR_STACK: readonly Collaborator[] = COLLABORATORS.slice(0, 3);

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  href: string;
}
export interface NavGroup {
  label: string;
  items: readonly NavLink[];
}
export type NavEntry = NavLink | NavGroup;

export const NAV: readonly NavEntry[] = [
  {
    label: "Features",
    items: [
      { label: "Real-time editing", href: LINKS.realtimeEditing },
      { label: "Rich-text editor", href: LINKS.richText },
      { label: "Version history", href: LINKS.versionHistory },
    ],
  },
  {
    label: "Use cases",
    items: [
      { label: "Team wikis", href: LINKS.teamWikis },
      { label: "Meeting notes", href: LINKS.meetingNotes },
      { label: "Product specs", href: LINKS.productSpecs },
      { label: "Content teams", href: LINKS.contentTeams },
    ],
  },
  {
    label: "Learn",
    items: [
      { label: "Documentation", href: LINKS.documentation },
      { label: "Guides", href: LINKS.guides },
    ],
  },
  { label: "Blog", href: LINKS.blog },
];

export const HEADER = {
  beta: "Beta",
  login: "Log in",
  cta: "Give it a try",
  menuOpen: "Open menu",
  menuClose: "Close menu",
} as const;

/* -------------------------------------------------------------------------- */
/* Section copy                                                               */
/* -------------------------------------------------------------------------- */

export const HERO = {
  titleBefore: "Team docs with",
  highlight: "real-time",
  titleAfter: "collaboration",
  subtitle:
    "One shared editor where your whole team writes, edits and comments together, with every keystroke synced instantly.",
  cta: "Try it out",
  cursors: {
    afterTitleBefore: { name: "Subh", color: PALETTE[0] },
    beforeTitleAfter: { name: "Meera", color: PALETTE[3] },
  },
} as const;

export const HERO_VISUAL = {
  label: "Product preview",
  windowTitle: "Launch plan",
  alt: "The editor open on a launch plan, with several teammates' cursors and comments visible in the document.",
  hint: "or watch the whole video",
  button: "Watch video",
} as const;

export const ANNOUNCE = {
  title: "Introducing Live Presence",
  body: "See who's in the document, follow their cursor, and watch edits land the instant they happen, with no refresh, no locking, no waiting.",
  primary: "See how it works",
  secondary: "Read the docs",
  alt: "A floating panel showing teammates' avatars and live cursors inside a document.",
} as const;

export interface FeatureTab {
  id: string;
  label: string;
  icon: LucideIcon;
  caption: string;
}

export const FEATURES: {
  titleLines: readonly string[];
  tablistLabel: string;
  tabs: FeatureTab[];
} = {
  titleLines: ["Everything you need to write.", "Nothing you don't."],
  tablistLabel: "Editor features",
  tabs: [
    {
      id: "text",
      label: "Text",
      icon: Type,
      caption:
        "A full-featured editor with every formatting tool you expect, and every change shared live.",
    },
    {
      id: "tables",
      label: "Tables",
      icon: Table,
      caption:
        "Build and resize tables together without stepping on each other.",
    },
    {
      id: "code",
      label: "Code",
      icon: Code,
      caption:
        "Paste in code blocks with syntax highlighting and edit them side by side.",
    },
    {
      id: "media",
      label: "Media",
      icon: ImageIcon,
      caption:
        "Drop in images and screenshots and watch them appear for everyone at once.",
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: ListChecks,
      caption:
        "Turn any list into a task list, assign it, and tick things off together.",
    },
    {
      id: "history",
      label: "History",
      icon: History,
      caption:
        "Browse saved versions and restore an earlier snapshot when needed.",
    },
  ],
};

export const DARKMODE = {
  title: "Now, even in Dark Mode.",
  body: "Settle into a focused dark workspace with a softer interface that is easy on the eyes, especially when you're working late.",
  windowTitle: "Sprint retro",
  editorAlt:
    "A document open in the app's dark mode, with a calm, high-contrast interface.",
  cardAlt:
    "A dark-mode document interface with readable text and carefully balanced contrast.",
} as const;

export const TEAM = {
  titleLines: ["Your whole team,", "literally in the", "same document."],
  subtitle: "Share a link to invite your team in real time.",
  share: "Share",
  extra: 4,
  tablistLabel: "Collaboration features",
  autoAdvanceSeconds: 6,
  tabs: [
    {
      icon: UserPlus,
      text: "Ask to join in a document and invite teammates to collaborate.",
      alt: "A page showing ask to join in a document.",
    },
    {
      icon: MessageSquare,
      text: "Browse saved versions and restore an earlier snapshot from the editor.",
      alt: "A page showing saved document versions and a restore action.",
    },
    {
      icon: Users,
      text: "See who's online and follow along live with presence cursors.",
      alt: "A document with three colored presence cursors and a list of who is online.",
    },
  ],
} as const;

export const QUICK_START = {
  label: "Quick start",
  titleBefore: "Just click",
  url: `+ New Document`,
  titleAfter: "and start writing.",
  note: "One link, one click. Your new document is ready to share in seconds.",
  tab: "New document",
  share: "Share",
  alt: "A new, empty document open in the browser with the cursor blinking on the first line.",
} as const;

export const TEMPLATES = {
  title: "Start faster with templates for…",
  alt: "A meeting-notes template with an agenda, decisions and action items already laid out.",
  items: [
    {
      icon: ClipboardList,
      title: "Meeting notes",
      body: "Capture agendas, decisions and action items while everyone's in the room, or on the call.",
    },
    {
      icon: FileText,
      title: "Product specs",
      body: "Draft, review and align on specs with comments and suggestions in one place.",
    },
    {
      icon: BookOpen,
      title: "Team wikis",
      body: "Build a living knowledge base your whole team can keep up to date.",
    },
  ],
} as const;

export const CTA = {
  titleLines: ["Ready to go? Start", "writing together."],
  button: "Try it out",
  note: "This is just a Demo Project, try it out & rate it.",
} as const;

export const FOOTER = {
  newsletter: {
    heading: "Newsletter",
    body: "We love to share our love for writing and collaboration with you in our monthly newsletter.",
    label: "Email address",
    placeholder: "you@example.com",
    button: "Subscribe",
  },
  columns: [
    {
      heading: "Company",
      links: [
        { label: "Blog", href: LINKS.blog },
        { label: "Careers", href: LINKS.careers },
        { label: "Privacy", href: LINKS.privacy },
      ],
    },
    {
      heading: "Social",
      links: [
        { label: "Twitter", href: LINKS.twitter },
        { label: "Discord", href: LINKS.discord },
        { label: "LinkedIn", href: LINKS.linkedin },
      ],
    },
    {
      heading: "Product",
      links: [
        { label: "Overview", href: LINKS.overview },
        { label: "Roadmap", href: LINKS.roadmap },
        { label: "Book a demo", href: LINKS.bookDemo },
      ],
    },
    {
      heading: "Resources",
      links: [
        { label: "Documentation", href: LINKS.documentation },
        { label: "GitHub", href: LINKS.github },
        { label: "Contact us", href: LINKS.contact },
      ],
    },
  ],
} as const;
