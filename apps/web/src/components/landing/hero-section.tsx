import { HERO, LINKS } from "@/components/landing/content";
import {
  Button,
  CollabCursor,
  Container,
  Highlight,
} from "@/components/landing/ui";

export function HeroSection() {
  const { cursors } = HERO;
  return (
    <section
      aria-labelledby="lp-hero-title"
      className="pb-16 pt-16 text-center md:pb-24 md:pt-24"
    >
      <Container>
        <h1 id="lp-hero-title" className="lp-display lp-h1">
          <span className="relative inline-block">
            {HERO.titleBefore}
            <CollabCursor
              name={cursors.afterTitleBefore.name}
              color={cursors.afterTitleBefore.color}
              avatar="/user-images/user-1.webp"
              duration={7}
              className="left-full top-1/2 ml-px -translate-y-1/2"
            />
          </span>
          <br className="hidden md:block" />{" "}
          <span className="relative inline-block">
            <Highlight>{HERO.highlight}</Highlight>
          </span>
          <br className="hidden md:block" />{" "}
          <span className="relative inline-block">
            <CollabCursor
              name={cursors.beforeTitleAfter.name}
              color={cursors.beforeTitleAfter.color}
              avatar="/user-images/user-2.webp"
              duration={8.5}
              delay={-2}
              upsideDown
              className="right-full top-1/2 mr-px mt-2 -translate-y-1/2"
            />
            {HERO.titleAfter}
          </span>
        </h1>

        <p className="lp-muted mx-auto mt-8 max-w-md text-[15px] leading-relaxed md:text-base">
          {HERO.subtitle}
        </p>

        <div className="mt-8">
          <Button
            size="lg"
            chevron
            href={LINKS.login}
            className="w-full sm:w-auto"
          >
            {HERO.cta}
          </Button>
        </div>
      </Container>
    </section>
  );
}
