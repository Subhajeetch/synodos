import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { HEADER, LINKS, NAV } from "@/components/landing/content";
import type { NavGroup } from "@/components/landing/content";
import { Button, Container } from "@/components/landing/ui";
import { Logo } from "@/components/ui/logo";

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const NAV_BUTTON =
  "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] text-[color:var(--lp-fg)] transition-colors hover:bg-black/[0.05]";

function DesktopGroup({
  group,
  open,
  onOpenChange,
}: {
  group: NavGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const panelId = `lp-nav-${slug(group.label)}`;
  return (
    <div
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onOpenChange(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") onOpenChange(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onOpenChange(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        // detail === 0 means the click came from the keyboard: toggle. Mouse and
        // touch clicks keep the menu open, since hover has usually opened it already.
        onClick={(e) => onOpenChange(e.detail === 0 ? !open : true)}
        className={NAV_BUTTON}
      >
        {group.label}
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 text-[color:var(--lp-muted)] motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <ul
            id={panelId}
            className="min-w-[230px] rounded-[14px] border border-[color:var(--lp-border)] bg-white p-1.5 shadow-[0_24px_60px_-16px_rgba(10,10,11,0.22)]"
          >
            {group.items.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="flex h-10 items-center rounded-lg px-3 text-sm text-[color:var(--lp-fg)] transition-colors hover:bg-black/[0.05]"
                  onClick={() => onOpenChange(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // While a desktop dropdown is open: close it on an outside pointer-down, and on
  // Esc. Esc is handled on the document so it also dismisses a menu that was
  // opened by hover alone, where focus is not inside the menu.
  useEffect(() => {
    if (!openGroup) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const nav = navRef.current;
      const trigger = nav?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
      // Hand focus back to the trigger if it was inside the menu.
      if (nav && document.activeElement && nav.contains(document.activeElement)) trigger?.focus();
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  // Mobile menu: lock page scroll, close on Esc, close if the viewport grows to desktop.
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onBreakpoint = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 h-14 border-b border-[color:var(--lp-border)] bg-[#F8F8F8]/80 backdrop-blur-md">
        <Container className="flex h-full items-center justify-between">
          <div className="flex min-w-0 items-center">
            <a
              href={LINKS.home}
              className="flex items-center gap-2 rounded-md text-[15px] font-semibold tracking-tight"
            >
              <Logo className="mx-auto h-6 w-auto text-[color:var(--lp-fg)] [--logo-background:#F8F8F8]" />
            </a>

            <nav ref={navRef} aria-label="Main" className="ml-4 hidden items-center lg:flex">
              {NAV.map((entry) =>
                "items" in entry ? (
                  <DesktopGroup
                    key={entry.label}
                    group={entry}
                    open={openGroup === entry.label}
                    onOpenChange={(open) => setOpenGroup(open ? entry.label : null)}
                  />
                ) : (
                  <a key={entry.label} href={entry.href} className={NAV_BUTTON}>
                    {entry.label}
                  </a>
                ),
              )}
            </nav>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={LINKS.login}
              className="inline-flex h-9 items-center rounded-lg px-2 text-[13px] text-[color:var(--lp-fg)] transition-colors hover:bg-black/[0.05]"
            >
              {HEADER.login}
            </a>
            <Button size="md" chevron href={LINKS.tryFree}>
              {HEADER.cta}
            </Button>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label={mobileOpen ? HEADER.menuClose : HEADER.menuOpen}
            aria-expanded={mobileOpen}
            aria-controls="lp-mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="-mr-2.5 grid size-11 place-items-center rounded-lg lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </Container>
      </header>

      {/* Sibling of <header>, not a child: backdrop-filter would otherwise become
          the containing block for this fixed panel. */}
      <div
        id="lp-mobile-menu"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        className={`fixed inset-x-0 bottom-0 top-14 z-40 grid bg-[#F8F8F8] lg:hidden motion-safe:transition-[grid-template-rows,opacity,filter] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:filter-none ${
          mobileOpen
            ? "grid-rows-[1fr] opacity-100 blur-0"
            : "pointer-events-none grid-rows-[0fr] opacity-0 blur-[12px]"
        }`}
      >
        <div className="min-h-0 overflow-y-auto">
          <Container className="pb-10 pt-2">
            <nav aria-label="Mobile">
              {NAV.map((entry) => {
                if (!("items" in entry)) {
                  return (
                    <a
                      key={entry.label}
                      href={entry.href}
                      onClick={closeMobile}
                      className="flex min-h-12 items-center border-b border-[color:var(--lp-border)] text-base font-medium"
                    >
                      {entry.label}
                    </a>
                  );
                }
                const open = mobileGroup === entry.label;
                const panelId = `lp-mobile-${slug(entry.label)}`;
                return (
                  <div key={entry.label} className="border-b border-[color:var(--lp-border)]">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setMobileGroup(open ? null : entry.label)}
                      className="flex min-h-12 w-full items-center justify-between text-base font-medium"
                    >
                      {entry.label}
                      <ChevronDown
                        aria-hidden="true"
                        className={`size-4 text-[color:var(--lp-muted)] motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div
                      className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-400 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <ul id={panelId} aria-hidden={!open} inert={!open} className="min-h-0 overflow-hidden pb-3">
                        {entry.items.map((item) => (
                          <li key={item.label}>
                            <a
                              href={item.href}
                              onClick={closeMobile}
                              className="flex min-h-11 items-center pl-3 text-[15px] text-[color:var(--lp-muted)]"
                            >
                              {item.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </nav>
            <div className="mt-8 grid gap-3">
              <Button variant="secondary" size="lg" href={LINKS.login} onClick={closeMobile} className="w-full">
                {HEADER.login}
              </Button>
              <Button size="lg" chevron href={LINKS.tryFree} onClick={closeMobile} className="w-full">
                {HEADER.cta}
              </Button>
            </div>
          </Container>
        </div>
      </div>
    </>
  );
}