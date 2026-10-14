import { DARKMODE, IMAGES, IMAGE_SPECS } from "@/components/landing/content";
import { Container, DemoImage, Reveal, Section, WindowFrame } from "@/components/landing/ui";

export function DarkModeSection() {
  return (
    <Section tone="dark" labelledBy="lp-darkmode-title" gradient={{ src: IMAGES.gradients.dark }} pad="pt-24 md:pt-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
          <h2 id="lp-darkmode-title" className="lp-display lp-h2 text-white md:max-w-[640px]">
            {DARKMODE.title}
          </h2>
          <p className="max-w-[280px] text-sm leading-relaxed text-[color:var(--lp-dark-muted)]">
            {DARKMODE.body}
          </p>
        </div>

        <Reveal className="mt-14">
          <WindowFrame variant="dark" title={DARKMODE.windowTitle}>
            <DemoImage
              src={IMAGES.darkmodeEditor}
              alt={DARKMODE.editorAlt}
              spec={IMAGE_SPECS.darkmodeEditor}
            />
          </WindowFrame>
        </Reveal>
      </Container>
    </Section>
  );
}