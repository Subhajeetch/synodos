import { IMAGES, IMAGE_SPECS, TEMPLATES } from "@/components/landing/content";
import { Container, DemoImage, Reveal, Section } from "@/components/landing/ui";

export function TemplatesSection() {
  return (
    <Section
      labelledBy="lp-templates-title"
      pad="pb-12 pt-20 md:pb-16 md:pt-28 lg:pt-36"
    >
      <Container>
        <h2 id="lp-templates-title" className="lp-display lp-h2 text-center">
          {TEMPLATES.title}
        </h2>

        <ul className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
          {TEMPLATES.items.map((item) => (
            <li
              key={item.title}
              className="flex flex-col items-center text-center"
            >
              <item.icon
                aria-hidden="true"
                className="size-6"
                strokeWidth={1.5}
              />
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="lp-muted mt-2 max-w-[240px] text-sm leading-relaxed">
                {item.body}
              </p>
            </li>
          ))}
        </ul>

        <Reveal className="mx-auto mt-14 max-w-3xl">
          {/* The bottom mask fades the card into the next section. */}
          <div className="lp-fade-bottom overflow-hidden rounded-[20px] border border-[color:var(--lp-border)] bg-white shadow-[0_30px_80px_-20px_rgba(30,15,90,0.2)]">
            <DemoImage
              src={IMAGES.templates}
              alt={TEMPLATES.alt}
              spec={IMAGE_SPECS.templates}
            />
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
