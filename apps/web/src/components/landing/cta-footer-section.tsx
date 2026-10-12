import { Fragment } from "react";
import { CTA, IMAGES, LINKS } from "@/components/landing/content";
import { Footer } from "@/components/landing/footer";
import { Button, Container, Section } from "@/components/landing/ui";

/** CTA and footer share one gradient backdrop, so the wrapper is a plain div. */
export function CtaFooterSection() {
  return (
    <Section as="div" corner="tr" gradient={{ src: IMAGES.gradients.cta }} pad="pb-6">
      <section aria-labelledby="lp-cta-title" className="pt-40 md:pt-56">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
            <div>
              <h2 id="lp-cta-title" className="lp-display lp-h2 text-balance">
                {CTA.titleLines.map((line, i) => (
                  <Fragment key={line}>
                    {line}
                    {i < CTA.titleLines.length - 1 && (
                      <>
                        <br className="hidden md:block" />{" "}
                      </>
                    )}
                  </Fragment>
                ))}
              </h2>
              <div className="mt-8">
                <Button size="lg" chevron href={LINKS.getStarted} className="w-full sm:w-auto">
                  {CTA.button}
                </Button>
              </div>
            </div>
            <p className="hidden max-w-[240px] text-sm leading-relaxed text-[#3A3A4A] md:block">
              {CTA.note}
            </p>
          </div>
        </Container>
      </section>
      <Footer />
    </Section>
  );
}