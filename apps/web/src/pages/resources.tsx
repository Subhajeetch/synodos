import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Mail,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { CONTACT_CONTENT, DOCS_CONTENT, BLOG_CONTENT, GUIDES_CONTENT } from "@/components/contents/docs-contents";
import type { ResourceSection } from "@/components/contents/docs-contents";
import { LINKS } from "@/components/landing/content";
import { SiteHeader } from "@/components/site-header";
import "./resources.css";

type ResourceKind = "docs" | "guides" | "blog" | "contact";

const RESOURCE_META: Record<ResourceKind, { title: string; description: string }> = {
  docs: { title: DOCS_CONTENT.title, description: DOCS_CONTENT.description },
  guides: { title: GUIDES_CONTENT.title, description: GUIDES_CONTENT.description },
  blog: { title: BLOG_CONTENT.title, description: BLOG_CONTENT.description },
  contact: { title: CONTACT_CONTENT.title, description: CONTACT_CONTENT.description },
};

function getKind(pathname: string): ResourceKind {
  if (pathname === LINKS.guides) return "guides";
  if (pathname === LINKS.blog) return "blog";
  if (pathname === LINKS.contact) return "contact";
  return "docs";
}

function updateMeta(attribute: "name" | "property", key: string, content: string) {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (existing) {
    const previous = existing.content;
    existing.content = content;
    return () => { existing.content = previous; };
  }
  const element = document.createElement("meta");
  element.setAttribute(attribute, key);
  element.content = content;
  document.head.append(element);
  return () => element.remove();
}

function ResourceIntro({ kind }: { kind: ResourceKind }) {
  const content = RESOURCE_META[kind];
  const eyebrow: Record<ResourceKind, string> = {
    docs: "Product documentation",
    guides: "Field guides",
    blog: "From the Synodos team",
    contact: "Get in touch",
  };
  return (
    <div className="resource-intro">
      <p className="resource-eyebrow">{eyebrow[kind]}</p>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </div>
  );
}

function DocsContent() {
  const sections: readonly ResourceSection[] = DOCS_CONTENT.sections;
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    let frame = 0;
    const updateActiveSection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const activationLine = window.innerHeight * 0.24;
        let currentSection = sections[0]?.id ?? "";

        for (const section of sections) {
          const element = document.getElementById(section.id);
          if (element && element.getBoundingClientRect().top <= activationLine) {
            currentSection = section.id;
          } else {
            break;
          }
        }

        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
          currentSection = sections.at(-1)?.id ?? currentSection;
        }
        setActiveSection(currentSection);
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sections]);

  return (
    <div className="resource-docs-layout">
      <aside className="resource-docs-sidebar" aria-label="Documentation contents">
        <div className="resource-sidebar-label"><BookOpen aria-hidden="true" size={16} /> In this guide</div>
        <nav>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={activeSection === section.id ? "resource-current" : ""}
              aria-current={activeSection === section.id ? "location" : undefined}
            >
              {section.title}
            </a>
          ))}
        </nav>
        <div className="resource-sidebar-help">
          <span>Need a hand?</span>
          <Link to={LINKS.contact}>Contact the project <ArrowRight aria-hidden="true" size={14} /></Link>
        </div>
      </aside>
      <div className="resource-docs-article">
        {sections.map((section) => (
          <section className="resource-doc-section" id={section.id} key={section.id}>
            <p className="resource-section-kicker">Synodos basics</p>
            <h2>{section.title}</h2>
            <p className="resource-section-description">{section.description}</p>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && (
              <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
            )}
          </section>
        ))}
        <div className="resource-feedback">
          <div>
            <strong>Still have a question?</strong>
            <p>Get in touch or browse the source repository.</p>
          </div>
          <Link to={LINKS.contact}>Contact us <ArrowRight aria-hidden="true" size={15} /></Link>
        </div>
      </div>
    </div>
  );
}

function GuidesContent() {
  return (
    <div className="resource-guide-grid">
      {GUIDES_CONTENT.guides.map((guide, index) => (
        <article className="resource-guide-card" key={guide.title}>
          <div className="resource-card-topline">
            <span>{guide.category}</span>
            <span className="resource-card-number">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <h2>{guide.title}</h2>
          <p>{guide.description}</p>
          <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </article>
      ))}
    </div>
  );
}

function BlogContent() {
  return (
    <div className="resource-blog-empty">
      <p>No blogs posted yet.</p>
    </div>
  );
}

function ContactContent() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const copyEmail = async () => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(CONTACT_CONTENT.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError("Could not copy automatically. Select and copy the email address instead.");
    }
  };

  return (
    <div className="resource-contact-grid">
      <section className="resource-contact-card resource-contact-email">
        <span className="resource-contact-icon"><Mail aria-hidden="true" size={19} /></span>
        <p className="resource-card-topline">EMAIL</p>
        <h2>Send a note</h2>
        <p>For feedback, questions, or a bug report, email the project maintainer.</p>
        <div className="resource-email-row">
          <a href={`mailto:${CONTACT_CONTENT.email}`}>{CONTACT_CONTENT.email}</a>
          <button type="button" onClick={() => void copyEmail()} aria-label="Copy email address" title="Copy email address">
            {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        {copyError && <p className="resource-copy-error" role="status">{copyError}</p>}
      </section>
      <section className="resource-contact-card">
        <span className="resource-contact-icon"><ExternalLink aria-hidden="true" size={19} /></span>
        <p className="resource-card-topline">OPEN SOURCE</p>
        <h2>Visit the project</h2>
        <p>Explore the code, report an issue, or follow the work on GitHub.</p>
        <a className="resource-github-link" href={CONTACT_CONTENT.github} target="_blank" rel="noreferrer">
          github.com/Subhajeetch/synodos <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </section>
      <p className="resource-contact-note">{CONTACT_CONTENT.note}</p>
    </div>
  );
}

export default function ResourcesPage() {
  const { pathname } = useLocation();
  const kind = getKind(pathname);
  const meta = RESOURCE_META[kind];

  useEffect(() => {
    const title = `${meta.title} | Synodos`;
    const canonical = new URL(pathname, window.location.origin).href;
    const previousTitle = document.title;
    const existingCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = existingCanonical?.href;
    const cleanups = [
      updateMeta("name", "description", meta.description),
      updateMeta("property", "og:title", title),
      updateMeta("property", "og:description", meta.description),
      updateMeta("property", "og:url", canonical),
      updateMeta("name", "twitter:title", title),
      updateMeta("name", "twitter:description", meta.description),
    ];
    let canonicalLink = existingCanonical;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.append(canonicalLink);
    }
    canonicalLink.href = canonical;
    document.title = title;
    return () => {
      document.title = previousTitle;
      for (const cleanup of cleanups.reverse()) cleanup();
      if (previousCanonical && canonicalLink) canonicalLink.href = previousCanonical;
      else canonicalLink?.remove();
    };
  }, [meta, pathname]);

  return (
    <div className="resource-root">
      <SiteHeader />
      <main className={`resource-main resource-main-${kind}`}>
        <div className="resource-breadcrumb">
          <Link to={LINKS.home}>Home</Link><ChevronRight aria-hidden="true" size={14} /><span>{meta.title}</span>
        </div>
        <ResourceIntro kind={kind} />
        {kind === "docs" && <DocsContent />}
        {kind === "guides" && <GuidesContent />}
        {kind === "blog" && <BlogContent />}
        {kind === "contact" && <ContactContent />}
      </main>
      <footer className="resource-footer">
        <span>© {new Date().getFullYear()} Synodos</span>
        <div>
          <Link to={LINKS.documentation}>Documentation</Link>
          <Link to={LINKS.guides}>Guides</Link>
          <Link to={LINKS.blog}>Blog</Link>
          <a href={CONTACT_CONTENT.github} target="_blank" rel="noreferrer">GitHub <ExternalLink aria-hidden="true" size={13} /></a>
        </div>
      </footer>
    </div>
  );
}
