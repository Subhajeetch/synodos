import { HERO_VISUAL, IMAGES, IMAGE_SPECS, LINKS } from "@/components/landing/content";
import { Button, Container, DemoImage, Reveal, Section, WindowFrame } from "@/components/landing/ui";
import { Play } from "lucide-react";

export function HeroVisualSection() {
  return (
    <Section
      label={HERO_VISUAL.label}
      corner="tl"
      gradient={{ src: IMAGES.gradients.hero }}
      pad="pb-24 pt-10 md:pb-32 md:pt-16"
    >
      <Container>
        <Reveal className="mx-auto max-w-[1100px]">
          <WindowFrame variant="light" title={HERO_VISUAL.windowTitle}>
            <DemoImage
              src={IMAGES.hero}
              alt={HERO_VISUAL.alt}
              spec={IMAGE_SPECS.hero}
              priority
            />
          </WindowFrame>
        </Reveal>

        <div className="mt-10 flex flex-col items-center gap-3 text-center md:mt-14">
          <p className="lp-muted text-[13px]">{HERO_VISUAL.hint}</p>
          <Button
            variant="secondary"
            size="lg"
            href={LINKS.watchVideo}
            leading={<Play aria-hidden="true" className="size-3.5 fill-current" />}
          >
            {HERO_VISUAL.button}
          </Button>
        </div>
      </Container>
    </Section>
  );
}