import { ANNOUNCE, APP_NAME, IMAGES, IMAGE_SPECS, LINKS } from "@/components/landing/content";
import {
  Button,
  DemoImage,
  GradientBackdrop,
  LogoMark,
  Reveal,
} from "@/components/landing/ui";

export function AnnouncementSection() {
  return (
    <section
      aria-labelledby="lp-announce-title"
      className="px-5 pb-16 pt-6 sm:px-8 md:pb-28 md:pt-12 lg:px-10"
    >
      <Reveal className="mx-auto max-w-[1100px]">
        <div className="relative rounded-3xl md:flex md:min-h-[340px] md:items-center lg:min-h-[410px]">
          {/* The gradient is clipped to the card; the demo image is not. The
              gradient is zoomed from the bottom-left so its baked-in corner
              falls outside the card. */}
          <div className="absolute inset-0 overflow-hidden">
            <GradientBackdrop
              src={IMAGES.gradients.announce}
              imgClassName=""
            />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:w-[46%] md:p-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1.5 pr-3 text-sm font-semibold backdrop-blur">
              <LogoMark className="size-5" />
              {APP_NAME}
            </span>
            <h2 id="lp-announce-title" className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">
              {ANNOUNCE.title}
            </h2>
            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[#45455A]">
              {ANNOUNCE.body}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="md" chevron href={LINKS.seeHow}>
                {ANNOUNCE.primary}
              </Button>
              <Button variant="secondary" size="md" chevron href={LINKS.readDocs}>
                {ANNOUNCE.secondary}
              </Button>
            </div>
          </div>

          <div className="relative z-10 -mb-8 px-6 sm:px-8 md:absolute md:bottom-[-28px] md:right-8 md:mb-0 md:w-[48%] md:p-0">
            <DemoImage
              src={IMAGES.announce}
              alt={ANNOUNCE.alt}
              spec={IMAGE_SPECS.announce}
              className="rounded-2xl border border-[color:var(--lp-border)] shadow-[0_30px_60px_-20px_rgba(30,15,90,0.35)]"
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}