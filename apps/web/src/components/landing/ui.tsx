import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  EllipsisVertical,
  RotateCw,
} from "lucide-react";
import type { ImageSpec } from "@/components/landing/content";

const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/* Container                                                                  */
/* -------------------------------------------------------------------------- */

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-10", className)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* GradientBackdrop                                                           */
/* The gradient art is 1440x775 with the big corner baked in at top-RIGHT.    */
/* `flip` mirrors it so the corner lands top-LEFT.                            */
/* -------------------------------------------------------------------------- */

export function GradientBackdrop({
  src,
  flip = false,
  imgClassName,
}: {
  src: string;
  flip?: boolean;
  imgClassName?: string;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#F8F8F8]">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={1440}
        height={775}
        loading="lazy"
        decoding="async"
        className={cx(
          "pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top",
          flip && "scale-x-[-1]",
          imgClassName,
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section                                                                    */
/* -------------------------------------------------------------------------- */

type Corner = "none" | "tl" | "tr";

const CORNER_CLASS: Record<Corner, string> = {
  none: "",
  tl: "rounded-tl-[var(--lp-corner)]",
  tr: "rounded-tr-[var(--lp-corner)]",
};

type SectionProps = {
  /** Use "div" when the wrapper should not be a landmark (e.g. CTA + footer). */
  as?: "section" | "div";
  labelledBy?: string;
  /** aria-label for sections without a visible heading. */
  label?: string;
  corner?: Corner;
  tone?: "light" | "dark";
  gradient?: { src: string; flip?: boolean; imgClassName?: string };
  /** Vertical padding classes. Replaces the default rather than adding to it. */
  pad?: string;
  className?: string;
  children: ReactNode;
};

export function Section({
  as = "section",
  labelledBy,
  label,
  corner = "none",
  tone = "light",
  gradient,
  pad = "py-20 md:py-28 lg:py-36",
  className,
  children,
}: SectionProps) {
  const Tag = as;
  const isSection = as === "section";
  return (
    <Tag
      aria-labelledby={isSection ? labelledBy : undefined}
      aria-label={isSection && !labelledBy ? label : undefined}
      className={cx(
        "relative",
        (corner !== "none" || gradient) && "overflow-hidden",
        CORNER_CLASS[corner],
        tone === "dark" && "lp-on-dark bg-[color:var(--lp-dark)] text-white",
        pad,
        className,
      )}
    >
      {gradient ? (
        <>
          <GradientBackdrop
            src={gradient.src}
            flip={gradient.flip}
            imgClassName={gradient.imgClassName}
          />
          <div className="relative z-10">{children}</div>
        </>
      ) : (
        children
      )}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonProps = {
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  /** Trailing ">" chevron. */
  chevron?: boolean;
  leading?: ReactNode;
  /** Renders an <a href="#"> by default. Use "button" for form submits. */
  as?: "a" | "button";
  href?: string;
  type?: "button" | "submit";
  className?: string;
  onClick?: () => void;
  children: ReactNode;
};

const BTN_BASE =
  "relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-medium transition-colors motion-safe:transition-[color,background-color,translate] motion-safe:duration-150";

const BTN_VARIANT = {
  primary:
    "bg-[color:var(--lp-fg)] text-white hover:bg-[#2A2A31] motion-safe:hover:-translate-y-px",
  secondary:
    "border border-[color:var(--lp-border)] bg-white text-[color:var(--lp-fg)] shadow-[0_1px_2px_rgba(10,10,11,0.04)] hover:bg-[#F3F3F5] motion-safe:hover:-translate-y-px",
} as const;

/* md is 36px tall; the pseudo-element extends the tap area to 44px. */
const BTN_SIZE = {
  md: "h-9 px-3.5 text-[13px] before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
  lg: "h-11 px-5 text-sm",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  chevron = false,
  leading,
  as = "a",
  href = "#",
  type = "button",
  className,
  onClick,
  children,
}: ButtonProps) {
  const classes = cx(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], className);
  const content = (
    <>
      {leading}
      {children}
      {chevron && <ChevronRight aria-hidden="true" className="-mr-1 size-4" strokeWidth={2} />}
    </>
  );
  if (as === "button") {
    return (
      <button type={type} className={classes} onClick={onClick}>
        {content}
      </button>
    );
  }
  return (
    <a href={href} className={classes} onClick={onClick}>
      {content}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Highlight: the inline word in a rounded colored box                        */
/* -------------------------------------------------------------------------- */

export function Highlight({
  color = "accent",
  className,
  children,
}: {
  color?: "accent" | "dark";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cx("lp-highlight", color === "dark" && "lp-highlight--dark", className)}>
      {children}
    </span>
  );
}

export function CollabCursor({
  name,
  color,
  avatar,
  showTag = true,
  duration = 7,
  delay = 0,
  upsideDown = false,
  className,
}: {
  name: string;
  color: string;
  /** Optional avatar image URL. Falls back to the first letter of `name`. */
  avatar?: string;
  showTag?: boolean;
  /** Float animation length in seconds. */
  duration?: number;
  delay?: number;
  /** Flips the pill so it hangs below the caret instead of sitting above it. */
  upsideDown?: boolean;
  className?: string;
}) {
  const style = {
    "--lp-c": color,
    "--lp-dur": `${duration}s`,
    "--lp-delay": `${delay}s`,
    // The line's size is set inline (em-based, so it matches the heading's text
    // size) so that no stylesheet rule can collapse or hide it.
    width: "clamp(3px, 0.05em, 5px)",
    height: "var(--lp-caret-h, 0.8em)",
  } as CSSProperties;

  const initial = (Array.from(name.trim())[0] ?? "?").toUpperCase();

  return (
    <span
      aria-hidden="true"
      style={style}
      className={cx(
        "lp-caret pointer-events-none absolute z-10",
        upsideDown && "lp-caret--upside-down",
        className,
      )}
    >
      {/* The float animation lives on this inner wrapper so it never fights
          the transform/translate utilities passed in through `className`. */}
      <span className="lp-caret__float absolute inset-0">
        {/* The vertical line (the "text caret") */}
        <span
          className="absolute inset-0 rounded-[1px]"
          style={{ backgroundColor: color }}
        />
        {showTag && (
          <span className="lp-caret__tag">
            <span className="lp-caret__avatar">
              {initial}
              {avatar && (
                <img
                  className="lp-caret__image"
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </span>
            <span className="lp-caret__name">{name}</span>
          </span>
        )}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Avatar / AvatarGroup                                                       */
/* -------------------------------------------------------------------------- */

export interface Person {
  name: string;
  color: string;
  src?: string;
}

export function Avatar({
  person,
  size = 28,
  ring = true,
}: {
  person: Person;
  size?: number;
  ring?: boolean;
}) {
  const classes = cx(
    "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white",
    ring && "ring-2 ring-white",
  );
  return (
    <span
      role="img"
      aria-label={person.name}
      className={cx(classes, "relative")}
      style={{
        width: size,
        height: size,
        backgroundColor: person.color,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {person.name.charAt(0)}
      {person.src && (
        <img
          src={person.src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 size-full rounded-full object-cover"
        />
      )}
    </span>
  );
}

export function AvatarGroup({
  people,
  extra,
  size = 28,
}: {
  people: readonly Person[];
  /** Renders a "+N" chip after the avatars. */
  extra?: number;
  size?: number;
}) {
  const overlap = Math.round(size * 0.32);
  return (
    <span className="inline-flex items-center">
      {people.map((person, i) => (
        <span
          key={person.name}
          className="relative inline-flex"
          style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i + 1 }}
        >
          <Avatar person={person} size={size} />
        </span>
      ))}
      {extra ? (
        <span
          className="inline-flex items-center justify-center rounded-full bg-[#ECECF0] px-1.5 text-xs font-medium text-[color:var(--lp-muted)] ring-2 ring-white"
          style={{ position: "relative", zIndex: people.length + 1, marginLeft: -overlap, height: size, minWidth: size }}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* WindowFrame                                                                */
/* -------------------------------------------------------------------------- */

const TRAFFIC_LIGHTS = ["#FF5F57", "#FEBC2E", "#28C840"] as const;

function TrafficLights() {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
      {TRAFFIC_LIGHTS.map((color) => (
        <span key={color} className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

type WindowFrameProps = {
  variant?: "light" | "dark" | "browser";
  /** Title shown in the light and dark title bars. */
  title?: string;
  /** Browser variant: tab label. */
  tab?: string;
  /** Browser variant: text of the centered URL pill. */
  url?: string;
  /** Browser variant: content on the right of the chrome (avatars, share…). */
  chromeRight?: ReactNode;
  /** Square off the bottom edge (used when the section clips the window). */
  flatBottom?: boolean;
  className?: string;
  children: ReactNode;
};

export function WindowFrame({
  variant = "light",
  title,
  tab,
  url,
  chromeRight,
  flatBottom = false,
  className,
  children,
}: WindowFrameProps) {
  const isDark = variant === "dark";
  const surface = isDark
    ? "border-white/10 bg-[#111114] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]"
    : "border-[color:var(--lp-border)] bg-white shadow-[0_30px_80px_-20px_rgba(30,15,90,0.25)]";
  const radius =
    variant === "light"
      ? flatBottom
        ? "rounded-t-[20px]"
        : "rounded-[20px]"
      : flatBottom
        ? "rounded-t-2xl"
        : "rounded-2xl";

  return (
    <div className={cx("overflow-hidden border", surface, radius, flatBottom && "border-b-0", className)}>
      {variant === "browser" ? (
        <div
          aria-hidden="true"
          className="flex h-11 items-center gap-3 border-b border-[color:var(--lp-border)] bg-[#F1F1F4] px-3 sm:px-4"
        >
          <TrafficLights />
          {tab && (
            <span className="hidden max-w-[150px] truncate rounded-lg bg-white px-3 py-1 text-xs font-medium text-[color:var(--lp-fg)] sm:block">
              {tab}
            </span>
          )}
          <span className="hidden items-center gap-2 text-[color:var(--lp-subtle)] md:flex">
            <ArrowLeft className="size-3.5" />
            <ArrowRight className="size-3.5" />
            <RotateCw className="size-3.5" />
          </span>
          <span className="mx-auto min-w-0 max-w-[380px] flex-1 truncate rounded-full bg-white px-3 py-1 text-center text-xs text-[color:var(--lp-muted)]">
            {url}
          </span>
          <span className="hidden items-center gap-3 md:flex">{chromeRight}</span>
          <EllipsisVertical className="size-4 shrink-0 text-[color:var(--lp-subtle)]" />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className={cx(
            "relative flex h-9 items-center border-b px-4",
            isDark ? "border-white/10" : "border-[color:var(--lp-border)]",
          )}
        >
          <TrafficLights />
          {title && (
            <span
              className={cx(
                "pointer-events-none absolute inset-x-16 truncate text-center text-xs",
                isDark ? "text-[color:var(--lp-dark-muted)]" : "text-[color:var(--lp-muted)]",
              )}
            >
              {title}
            </span>
          )}
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DemoImage: fixed aspect-ratio box + faint placeholder, so nothing shifts   */
/* -------------------------------------------------------------------------- */

export function DemoImage({
  src,
  alt,
  spec,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  spec: ImageSpec;
  /** Above-the-fold image: eager + high fetch priority. */
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx("relative w-full overflow-hidden bg-black/[0.03]", className)}
      style={{ aspectRatio: spec.ratio }}
    >
      <img
        src={src}
        alt={alt}
        width={spec.width}
        height={spec.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={priority ? undefined : "async"}
        className="block h-full w-full max-w-full object-cover"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reveal: fade-up on scroll. The motion itself is CSS inside a              */
/* prefers-reduced-motion: no-preference query, so reduced-motion users       */
/* simply see the content.                                                    */
/* -------------------------------------------------------------------------- */

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Delay in milliseconds. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style = delay
    ? ({ "--lp-reveal-delay": `${delay}ms` } as CSSProperties)
    : undefined;

  return (
    <div ref={ref} className={cx("lp-reveal", className)} style={style}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LogoMark                                                                   */
/* -------------------------------------------------------------------------- */

export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect width="24" height="24" rx="7" fill="#0A0A0B" />
      <circle cx="9.6" cy="12" r="4.6" stroke="#FFFFFF" strokeWidth="1.8" />
      <circle cx="14.4" cy="12" r="4.6" stroke="#8F82FF" strokeWidth="1.8" />
    </svg>
  );
}