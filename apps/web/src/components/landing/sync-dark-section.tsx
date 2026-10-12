import { IMAGES, IMAGE_SPECS, SYNC } from "@/components/landing/content";
import { Container, DemoImage, Reveal, Section, WindowFrame } from "@/components/landing/ui";

export function SyncDarkSection() {
  return (
    <Section tone="dark" labelledBy="lp-sync-title" gradient={{ src: IMAGES.gradients.dark }} pad="pt-24 md:pt-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
          <h2 id="lp-sync-title" className="lp-display lp-h2 text-white md:max-w-[640px]">
            {SYNC.title}
          </h2>
          <p className="max-w-[280px] text-sm leading-relaxed text-[color:var(--lp-dark-muted)]">
            {SYNC.body}
          </p>
        </div>

        <Reveal className="mt-14">
          <WindowFrame variant="dark" title={SYNC.windowTitle}>
            <DemoImage
              src={IMAGES.syncEditor}
              alt={SYNC.editorAlt}
              spec={IMAGE_SPECS.syncEditor}
            />
          </WindowFrame>
        </Reveal>
      </Container>
    </Section>
  );
}