import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Pause, Play } from "lucide-react";
import {
  AVATAR_STACK,
  COLLABORATORS,
  LINKS,
  TEAM,
  VIDEOS,
} from "@/components/landing/content";
import type { Collaborator } from "@/components/landing/content";
import {
  AvatarGroup,
  Button,
  Container,
  Section,
} from "@/components/landing/ui";

/* ----- Decorative collaborator pills ----- */

function CollabPill({ person }: { person: Collaborator }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium"
      style={{
        backgroundColor: `${person.color}1A`,
        borderColor: `${person.color}40`,
        color: `color-mix(in srgb, ${person.color} 68%, #000)`,
      }}
    >
      <span
        className="relative grid size-5 shrink-0 place-items-center overflow-hidden rounded-full text-[10px] font-semibold text-white"
        style={{ backgroundColor: person.color }}
      >
        {person.name.charAt(0)}
        <img
          src={person.src}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 size-full object-cover"
        />
      </span>
      {person.name}
    </span>
  );
}

/** Five names per row, wrapping around the list so rows are long enough to be cropped. */
function pillRow(start: number, row: number, length = 5): Collaborator[] {
  const people: Collaborator[] = [];
  for (let k = 0; k < length; k += 1) {
    const person =
      COLLABORATORS[(start + row * length + k) % COLLABORATORS.length];
    if (person) people.push(person);
  }
  return people;
}

const LEFT_ROW_OFFSETS = ["mr-0", "mr-10", "mr-4"] as const;
const RIGHT_ROW_OFFSETS = ["ml-0", "ml-10", "ml-4"] as const;

/** md+: three staggered rows hugging a viewport edge, cropped by it. */
function PillCluster({
  side,
  start,
}: {
  side: "left" | "right";
  start: number;
}) {
  const isLeft = side === "left";
  const offsets = isLeft ? LEFT_ROW_OFFSETS : RIGHT_ROW_OFFSETS;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-32 hidden w-[20%] overflow-hidden md:block lg:top-44 lg:w-[24%] xl:w-[26%] 2xl:w-[28%] ${
        isLeft ? "left-0" : "right-0"
      }`}
    >
      <div className="flex flex-col gap-3">
        {offsets.map((offset, row) => (
          <div
            key={offset}
            className={`flex gap-2 whitespace-nowrap ${isLeft ? "justify-end" : "justify-start"} ${offset}`}
          >
            {pillRow(start, row).map((person) => (
              <CollabPill key={person.name} person={person} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Below md: a slow infinite marquee instead of the clusters. */
function MarqueeRow({
  people,
  reverse = false,
  seconds = 50,
}: {
  people: readonly Collaborator[];
  reverse?: boolean;
  seconds?: number;
}) {
  const style = { "--lp-dur": `${seconds}s` } as CSSProperties;
  return (
    <div aria-hidden="true" className="overflow-hidden md:hidden">
      <div
        className={`lp-marquee flex w-max ${reverse ? "lp-marquee--rev" : ""}`}
        style={style}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-2 pr-2">
            {people.map((person) => (
              <CollabPill key={`${copy}-${person.name}`} person={person} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----- Section ----- */

export function TeamSection() {
  const count = TEAM.tabs.length;
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0); // bumps on every selection so the progress bar restarts
  const [paused, setPaused] = useState(false);
  const [pausedVideos, setPausedVideos] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const previousActive = useRef<number | null>(null);

  const select = (index: number) => {
    setActive(index);
    setCycle((c) => c + 1);
  };
  const advance = () => select((active + 1) % count);

  useEffect(() => {
    const switchedTab = previousActive.current !== active;
    previousActive.current = active;

    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index !== active || pausedVideos.has(index)) {
        video.pause();
        return;
      }

      if (switchedTab) video.currentTime = 0;
      void video.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.error("Unable to play landing feature video", error);
      });
    });
  }, [active, pausedVideos]);

  const toggleVideoPlayback = () => {
    setPausedVideos((previous) => {
      const next = new Set(previous);
      if (next.has(active)) next.delete(active);
      else next.add(active);
      return next;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (active + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
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
    select(next);
    tabRefs.current[next]?.focus();
  };

  const progressStyle = {
    "--lp-progress-dur": `${TEAM.autoAdvanceSeconds}s`,
    animationPlayState: paused ? "paused" : "running",
  } as CSSProperties;

  return (
    <Section
      labelledBy="lp-team-title"
      pad="pb-24 pt-8 md:pb-32 md:pt-16 lg:pb-40"
    >
      <PillCluster side="left" start={0} />
      <PillCluster side="right" start={6} />

      <div className="space-y-10 md:space-y-0">
        <MarqueeRow people={COLLABORATORS.slice(0, 6)} />

        <Container>
          {/* The H2 is inline so the avatars and Share button can sit on the end of its last line. */}
          <div className="lp-display lp-h2 mx-auto max-w-[760px] text-center md:pt-6">
            <h2 id="lp-team-title" className="inline">
              {TEAM.titleLines.map((line, i) => (
                <Fragment key={line}>
                  {line}
                  {i < TEAM.titleLines.length - 1 && (
                    <>
                      <br className="hidden md:block" />{" "}
                    </>
                  )}
                </Fragment>
              ))}
            </h2>{" "}
            <span className="lp-sans ml-1 inline-flex items-center gap-3 whitespace-nowrap align-middle">
              <AvatarGroup people={AVATAR_STACK} extra={TEAM.extra} size={32} />
              <Button variant="secondary" size="md" href={LINKS.share}>
                {TEAM.share}
              </Button>
            </span>
          </div>
          <p className="lp-muted mx-auto mt-6 max-w-md text-center text-[15px] leading-relaxed">
            {TEAM.subtitle}
          </p>
        </Container>

        <MarqueeRow people={COLLABORATORS.slice(6)} reverse seconds={56} />
      </div>

      <Container className="mt-12 md:mt-20">
        <div
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setPaused(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setPaused(false);
          }}
          onFocus={(e) => {
            if (e.target.matches(":focus-visible")) setPaused(true);
          }}
          onBlur={() => setPaused(false)}
        >
          <div
            role="tablist"
            aria-label={TEAM.tablistLabel}
            onKeyDown={onKeyDown}
            className="mx-auto grid max-w-[1000px] md:grid-cols-3"
          >
            {TEAM.tabs.map((tab, i) => {
              const isActive = i === active;
              return (
                <button
                  key={tab.text}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`lp-team-tab-${i}`}
                  aria-selected={isActive}
                  aria-controls="lp-team-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(i)}
                  className={`relative flex items-center gap-4 px-1 pb-6 pt-5 text-left text-sm leading-relaxed transition-colors md:flex-col md:px-8 md:text-center ${
                    isActive
                      ? "text-[color:var(--lp-fg)]"
                      : "text-[color:var(--lp-muted)] hover:text-[color:var(--lp-fg)]"
                  }`}
                >
                  <tab.icon
                    aria-hidden="true"
                    className="size-6 shrink-0"
                    strokeWidth={1.5}
                  />
                  <span className="max-w-[260px]">{tab.text}</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[color:var(--lp-border)]"
                  />
                  {isActive && (
                    <span
                      key={`${i}-${cycle}`}
                      aria-hidden="true"
                      className="lp-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[color:var(--lp-fg)]"
                      style={progressStyle}
                      onAnimationEnd={advance}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id="lp-team-panel"
            aria-labelledby={`lp-team-tab-${active}`}
            className="mx-auto mt-10 max-w-[900px] overflow-hidden rounded-[20px] border border-[color:var(--lp-border)] bg-white shadow-[0_30px_80px_-20px_rgba(30,15,90,0.22)]"
          >
            <div
              className="relative w-full bg-black/[0.03]"
              style={{ aspectRatio: "16 / 9" }}
            >
              {VIDEOS.team.map((src, i) => {
                const isActive = i === active;
                const label = TEAM.tabs[i]?.text ?? "Feature";
                return (
                  <video
                    key={src}
                    ref={(element) => {
                      videoRefs.current[i] = element;
                    }}
                    src={src}
                    aria-label={label}
                    aria-hidden={!isActive}
                    tabIndex={-1}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className={`absolute inset-0 h-full w-full object-cover motion-safe:transition-opacity motion-safe:duration-500 ${
                      isActive
                        ? "lp-team-video-enter opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                  />
                );
              })}
              <button
                type="button"
                onClick={toggleVideoPlayback}
                aria-label={`${pausedVideos.has(active) ? "Play" : "Pause"} video`}
                className="absolute bottom-4 right-4 z-10 grid size-11 place-items-center rounded-full border border-white/50 bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {pausedVideos.has(active) ? (
                  <Play aria-hidden="true" className="size-5 fill-current" />
                ) : (
                  <Pause aria-hidden="true" className="size-5 fill-current" />
                )}
              </button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
