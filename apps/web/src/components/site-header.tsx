import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useTheme } from "next-themes";
import { HEADER, LINKS, NAV } from "@/components/landing/content";
import type { NavGroup } from "@/components/landing/content";
import { Logo } from "@/components/ui/logo";
import "./site-header.css";

function DesktopGroup({
  group,
  open,
  onOpenChange,
  activePath,
}: {
  group: NavGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePath: string;
}) {
  const panelId = `site-nav-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div
      className="site-nav-group"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onOpenChange(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onOpenChange(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          onOpenChange(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => onOpenChange(event.detail === 0 ? !open : true)}
        className="site-nav-trigger"
      >
        {group.label}
        <ChevronDown
          aria-hidden="true"
          className={
            open ? "site-nav-chevron site-nav-chevron-open" : "site-nav-chevron"
          }
          size={14}
        />
      </button>
      {open && (
        <div className="site-nav-popover">
          <ul id={panelId}>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  aria-current={activePath === item.href ? "page" : undefined}
                  onClick={() => onOpenChange(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!openGroup) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      )
        setOpenGroup(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = headerRef.current?.querySelector<HTMLButtonElement>(
        'button[aria-expanded="true"]',
      );
      if (headerRef.current?.contains(document.activeElement)) trigger?.focus();
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
      <header ref={headerRef} className="site-header">
        <div className="site-header-inner">
          <Link
            to={LINKS.home}
            className="site-brand"
            aria-label="Synodos home"
          >
            <Logo />
          </Link>

          <nav aria-label="Main navigation" className="site-desktop-nav">
            {NAV.map((entry) =>
              "items" in entry ? (
                <DesktopGroup
                  key={entry.label}
                  group={entry}
                  open={openGroup === entry.label}
                  onOpenChange={(open) =>
                    setOpenGroup(open ? entry.label : null)
                  }
                  activePath={pathname}
                />
              ) : (
                <Link
                  key={entry.label}
                  to={entry.href}
                  aria-current={pathname === entry.href ? "page" : undefined}
                  className="site-direct-link"
                >
                  {entry.label}
                </Link>
              ),
            )}
          </nav>

          <div className="site-header-actions">
            <button
              type="button"
              className="site-theme-toggle"
              aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
              title={`Switch to ${isDark ? "light" : "dark"} theme`}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun aria-hidden="true" size={17} />
              ) : (
                <Moon aria-hidden="true" size={17} />
              )}
            </button>
            <Link to={LINKS.login} className="site-login-link">
              {HEADER.login}
            </Link>
            <Link to={LINKS.tryFree} className="site-header-cta">
              {HEADER.cta}
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="site-mobile-menu-button"
            aria-label={mobileOpen ? HEADER.menuClose : HEADER.menuOpen}
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X aria-hidden="true" size={20} />
            ) : (
              <Menu aria-hidden="true" size={20} />
            )}
          </button>
        </div>
      </header>

      <div
        id="site-mobile-menu"
        className={`site-mobile-menu${mobileOpen ? " site-mobile-menu-open" : ""}`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="site-mobile-menu-scroll">
          <nav aria-label="Mobile navigation">
            {NAV.map((entry) => {
              if (!("items" in entry)) {
                return (
                  <Link
                    key={entry.href}
                    to={entry.href}
                    aria-current={pathname === entry.href ? "page" : undefined}
                    onClick={closeMobile}
                    className="site-mobile-direct-link"
                  >
                    {entry.label}
                  </Link>
                );
              }
              const open = mobileGroup === entry.label;
              const panelId = `site-mobile-${entry.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <section key={entry.label} className="site-mobile-group">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setMobileGroup(open ? null : entry.label)}
                  >
                    {entry.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={
                        open
                          ? "site-nav-chevron site-nav-chevron-open"
                          : "site-nav-chevron"
                      }
                      size={16}
                    />
                  </button>
                  <div
                    className={
                      open
                        ? "site-mobile-subnav site-mobile-subnav-open"
                        : "site-mobile-subnav"
                    }
                  >
                    <ul id={panelId} aria-hidden={!open} inert={!open}>
                      {entry.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            to={item.href}
                            aria-current={
                              pathname === item.href ? "page" : undefined
                            }
                            onClick={closeMobile}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              );
            })}
          </nav>
          <div className="site-mobile-actions">
            <Link to={LINKS.login} onClick={closeMobile}>
              {HEADER.login}
            </Link>
            <Link to={LINKS.tryFree} onClick={closeMobile}>
              {HEADER.cta}
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <button
          type="button"
          className="site-mobile-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobile}
        />
      )}
    </>
  );
}
