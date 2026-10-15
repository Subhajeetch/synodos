import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Search,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { LINKS } from "@/components/landing/content";
import { DOCS_NAV, LEARN_PAGES } from "@/components/contents/learn-contents";
import type { DocsNavGroup, DocsPage } from "@/components/contents/learn-contents";
import { SiteHeader } from "@/components/site-header";
import "./learn.css";

const NAV_ITEMS = DOCS_NAV.flatMap((group) => group.items);

function updateMetaTag(attribute: "name" | "property", key: string, content: string) {
  const existing = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (existing) {
    const previousContent = existing.content;
    existing.content = content;
    return () => {
      existing.content = previousContent;
    };
  }

  const meta = document.createElement("meta");
  meta.setAttribute(attribute, key);
  meta.content = content;
  document.head.append(meta);
  return () => meta.remove();
}

function updateCanonical(href: string) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (existing) {
    const previousHref = existing.href;
    existing.href = href;
    return () => {
      existing.href = previousHref;
    };
  }

  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = href;
  document.head.append(link);
  return () => link.remove();
}

function headingId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function SidebarGroup({
  group,
  page,
  query,
}: {
  group: DocsNavGroup;
  page: DocsPage | undefined;
  query: string;
}) {
  const filteredItems = group.items.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  if (filteredItems.length === 0) return null;

  return (
    <section className="learn-sidebar-group" aria-label={group.label}>
      <h2>{group.label}</h2>
      <ul>
        {filteredItems.map((item) => {
          const external = item.href.startsWith("http");
          const active = page?.href === item.href;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={active ? "page" : undefined}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
              >
                <span>{item.label}</span>
                {external && <ExternalLink aria-hidden="true" size={14} />}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PageContent({ page }: { page: DocsPage }) {
  const [copyMessage, setCopyMessage] = useState("");
  const related = page.related
    .map((href) => NAV_ITEMS.find((item) => item.href === href))
    .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index);

  const copyPageLink = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage("Copy is unavailable in this browser. Copy the page URL from the address bar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Page link copied.");
    } catch {
      setCopyMessage("Unable to copy the link. Copy the page URL from the address bar.");
    }
  };

  return (
    <>
      <div className="learn-breadcrumbs" aria-label="Breadcrumb">
        <Link to={LINKS.documentation}>Docs</Link>
        <ChevronRight aria-hidden="true" size={15} />
        <span>{page.eyebrow}</span>
      </div>
      <div className="learn-title-row">
        <div>
          <p className="learn-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="learn-lede">{page.description}</p>
        </div>
        <div className="learn-copy-control">
          <button type="button" className="learn-copy-button" onClick={() => void copyPageLink()}>
            {copyMessage === "Page link copied." ? (
              <Check aria-hidden="true" size={16} />
            ) : (
              <Copy aria-hidden="true" size={16} />
            )}
            <span>{copyMessage === "Page link copied." ? "Copied" : "Copy page"}</span>
          </button>
          {copyMessage && <span role="status">{copyMessage}</span>}
        </div>
      </div>

      <div className="learn-article">
        {page.sections.map((section) => (
          <section id={headingId(section.title)} key={section.title} className="learn-article-section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>

      {related.length > 0 && (
        <nav className="learn-related" aria-label="Related pages">
          <h2>Keep exploring</h2>
          <div>
            {related.map((item) => (
              <a key={item.href} href={item.href}>
                <span>{item.label}</span>
                <ArrowUpRight aria-hidden="true" size={16} />
              </a>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

export default function LearnPage() {
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const page = useMemo(
    () => LEARN_PAGES.find((item) => item.href === pathname),
    [pathname],
  );
  const sections = page?.sections ?? [];

  useEffect(() => {
    const title = page ? `${page.title} | Synodos` : "Page not found | Synodos";
    const description = page?.description ??
      "Explore Synodos documentation for real-time collaborative writing, shared documents, and team workflows.";
    const cleanups = [
      updateMetaTag("name", "description", description),
      updateMetaTag("property", "og:title", title),
      updateMetaTag("property", "og:description", description),
      updateMetaTag("property", "og:url", window.location.href),
      updateMetaTag("name", "twitter:title", title),
      updateMetaTag("name", "twitter:description", description),
      updateCanonical(new URL(page?.href ?? window.location.pathname, window.location.origin).href),
    ];
    const previousTitle = document.title;
    document.title = title;

    return () => {
      document.title = previousTitle;
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [page]);

  return (
    <div className="learn-root">
      <SiteHeader />

      <div className="learn-layout">
        <aside
          id="learn-sidebar"
          className="learn-sidebar"
          aria-label="Documentation navigation"
        >
          <Link to={LINKS.documentation} className="learn-sidebar-home">
            <BookOpen aria-hidden="true" size={17} />
            <span>Explore Synodos</span>
          </Link>
          <label className="learn-search">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Search documentation pages</span>
            <input
              type="search"
              placeholder="Search docs..."
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <nav aria-label="Documentation pages">
            {DOCS_NAV.map((group) => (
              <SidebarGroup
                key={group.label}
                group={group}
                page={page}
                query={query}
              />
            ))}
            {query.trim() && NAV_ITEMS.every((item) => !item.label.toLowerCase().includes(query.trim().toLowerCase())) && (
              <p className="learn-no-results">No pages match “{query.trim()}”.</p>
            )}
          </nav>
          <div className="learn-sidebar-note">
            <span>Writing is better together.</span>
            <Link to={LINKS.tryFree}>Open Synodos <ArrowUpRight aria-hidden="true" size={14} /></Link>
          </div>
        </aside>

        <main id="learn-main" className="learn-main">
          {page ? (
            <PageContent page={page} />
          ) : (
            <div className="learn-not-found">
              <p className="learn-eyebrow">Page not found</p>
              <h1>We couldn’t find that page.</h1>
              <p>Choose a topic from the documentation navigation to keep exploring Synodos.</p>
              <Link to={LINKS.documentation}>Go to the documentation <ChevronRight aria-hidden="true" size={16} /></Link>
            </div>
          )}
        </main>

        {page && sections.length > 0 && (
          <aside className="learn-toc" aria-label="On this page">
            <h2>On this page</h2>
            <nav>
              {sections.map((section, index) => (
                <a key={section.title} href={`#${headingId(section.title)}`} className={index === 0 ? "learn-toc-current" : ""}>
                  {section.title}
                </a>
              ))}
            </nav>
            <div className="learn-toc-footer">
              <p>Made for teams who write together.</p>
              <a href={LINKS.github} target="_blank" rel="noreferrer">
                View project on GitHub <ExternalLink aria-hidden="true" size={14} />
              </a>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
