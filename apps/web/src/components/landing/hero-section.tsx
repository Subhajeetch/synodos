import { HERO, LINKS } from "@/components/landing/content";
import { Button, CollabCursor, Container, Highlight } from "@/components/landing/ui";

export function HeroSection() {
  const { cursors } = HERO;
  return (
    <section aria-labelledby="lp-hero-title" className="pb-16 pt-16 text-center md:pb-24 md:pt-24">
      <Container>
        <h1 id="lp-hero-title" className="lp-display lp-h1">
          <span className="relative inline-block">
            {HERO.titleBefore}
            <CollabCursor
              name={cursors.lineEnd.name}
              color={cursors.lineEnd.color}
              duration={7}
              className="left-full top-[0.06em] ml-[0.14em]"
            />
          </span>
          <br className="hidden md:block" />{" "}
          <span className="relative inline-block">
            <Highlight>{HERO.highlight}</Highlight>
            <CollabCursor
              name={cursors.left.name}
              color={cursors.left.color}
              duration={8.5}
              delay={-2}
              className="right-full top-[0.1em] mr-[0.35em] hidden md:block"
            />
            <CollabCursor
              name={cursors.right.name}
              color={cursors.right.color}
              duration={6.5}
              delay={-4}
              className="left-full top-[0.42em] ml-[0.3em] hidden md:block"
            />
            <CollabCursor
              name={cursors.pill.name}
              color={cursors.pill.color}
              duration={9}
              delay={-1}
              className="left-[66%] top-[0.3em]"
            />
          </span>
          <br className="hidden md:block" />{" "}
          {HERO.titleAfter}
        </h1>

        <p className="lp-muted mx-auto mt-8 max-w-md text-[15px] leading-relaxed md:text-base">
          {HERO.subtitle}
        </p>

        <div className="mt-8">
          <Button size="lg" chevron href={LINKS.getStarted} className="w-full sm:w-auto">
            {HERO.cta}
          </Button>
        </div>
      </Container>
    </section>
  );
}