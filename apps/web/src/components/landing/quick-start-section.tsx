import {
  AVATAR_STACK,
  IMAGES,
  IMAGE_SPECS,
  QUICK_START,
} from "@/components/landing/content";
import {
  AvatarGroup,
  Container,
  DemoImage,
  Highlight,
  Reveal,
  Section,
  WindowFrame,
} from "@/components/landing/ui";

export function QuickStartSection() {
  return (
    <Section
      gradient={{ src: IMAGES.gradients.quickStart }}
      labelledBy="lp-quick-title"
      // Heading sits low enough to land on the lighter part of the gradient.
      pad="pt-28 md:pt-40 lg:pt-48"
    >
      <Container>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-12">
          <h2 id="lp-quick-title" className="lp-display lp-h2 md:max-w-[640px]">
            {QUICK_START.titleBefore}{" "}
            <Highlight color="dark">{QUICK_START.url}</Highlight>{" "}
            {QUICK_START.titleAfter}
          </h2>
          <p className="max-w-[260px] text-sm leading-relaxed text-[#2C2C3A]">
            {QUICK_START.note}
          </p>
        </div>

        {/* No bottom border or radius: the negative margin lets the section edge clip the window. */}
        <Reveal className="-mb-10 mt-14 md:-mb-16">
          <WindowFrame
            variant="browser"
            tab={QUICK_START.tab}
            url={QUICK_START.url}
            flatBottom
            chromeRight={
              <>
                <AvatarGroup people={AVATAR_STACK} size={22} />
                <span className="inline-flex h-7 items-center rounded-lg border border-[color:var(--lp-border)] bg-white px-3 text-xs font-medium text-[color:var(--lp-fg)]">
                  {QUICK_START.share}
                </span>
              </>
            }
          >
            <DemoImage
              src={IMAGES.quickStart}
              alt={QUICK_START.alt}
              spec={IMAGE_SPECS.quickStart}
              className=""
            />
          </WindowFrame>
        </Reveal>
      </Container>
    </Section>
  );
}
