import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { FEATURES } from "@/components/landing/content";
import { Container, Reveal } from "@/components/landing/ui";

export function FeatureTabsSection() {
  const { tabs } = FEATURES;
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = tabs[active];

  // Keep the active tab centered when the row scrolls horizontally (phones).
  // Scrolls the row itself only, never the page.
  useEffect(() => {
    const list = listRef.current;
    const tab = tabRefs.current[active];
    if (!list || !tab) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const count = tabs.length;
    let next: number;
    switch (e.key) {
      case "ArrowRight":
        next = (active + 1) % count;
        break;
      case "ArrowLeft":
        next = (active - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby="lp-features-title" className="pb-32 pt-8 md:pb-48 md:pt-12">
      <Container className="text-center">
        <div
          ref={listRef}
          role="tablist"
          aria-label={FEATURES.tablistLabel}
          onKeyDown={onKeyDown}
          className="lp-no-scrollbar relative -mx-5 -my-4 flex snap-x snap-mandatory gap-1 overflow-x-auto px-5 py-4 sm:mx-0 sm:justify-center sm:px-0"
        >
          {tabs.map((tab, i) => {
            const isActive = i === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`lp-feature-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls="lp-feature-panel"
                aria-label={tab.label}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActive(i)}
                className="group flex h-[4.5rem] w-14 shrink-0 snap-center flex-col items-center gap-1 rounded-xl"
              >
                <span
                  className={`grid size-12 place-items-center rounded-xl transition-colors motion-safe:transition-[color,background-color,box-shadow] ${
                    isActive
                      ? "bg-white text-[color:var(--lp-accent)] shadow-[0_8px_24px_-8px_rgba(30,15,90,0.3)]"
                      : "text-[color:var(--lp-subtle)] group-hover:text-[color:var(--lp-muted)]"
                  }`}
                >
                  <tab.icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <span
                  aria-hidden="true"
                  className={`text-[10px] font-medium leading-none ${
                    isActive ? "text-[color:var(--lp-fg)]" : "opacity-0"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <Reveal>
          <h2 id="lp-features-title" className="lp-display lp-h2 mx-auto mt-10 md:mt-12">
            {FEATURES.titleLines.map((line) => (
              <span key={line} className="block text-balance">
                {line}
              </span>
            ))}
          </h2>
          <p
            key={current.id}
            id="lp-feature-panel"
            role="tabpanel"
            aria-labelledby={`lp-feature-tab-${current.id}`}
            className="lp-fade lp-muted mx-auto mt-5 min-h-[3.25rem] max-w-md text-[15px] leading-relaxed"
          >
            {current.caption}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}