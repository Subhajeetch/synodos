import type { FormEvent } from "react";
import { APP_NAME, FOOTER } from "@/components/landing/content";
import { Button, Container } from "@/components/landing/ui";

export function Footer() {
  const { newsletter, columns } = FOOTER;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: wire up newsletter signup
  };

  return (
    <footer className="mt-24 md:mt-32">
      <Container>
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h3 className="text-[13px] font-semibold">{newsletter.heading}</h3>
            <p className="lp-muted mt-3 max-w-[300px] text-sm leading-relaxed">{newsletter.body}</p>
            <form onSubmit={onSubmit} className="mt-4 flex max-w-sm gap-2">
              <label htmlFor="lp-newsletter-email" className="sr-only">
                {newsletter.label}
              </label>
              <input
                id="lp-newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder={newsletter.placeholder}
                className="h-10 min-w-0 flex-1 rounded-[10px] border border-[color:var(--lp-border)] bg-white px-3 text-sm text-[color:var(--lp-fg)] placeholder:text-[color:var(--lp-subtle)]"
              />
              <Button as="button" type="submit" size="md" className="h-10!">
                {newsletter.button}
              </Button>
            </form>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="text-[13px] font-semibold">{column.heading}</h3>
              <ul className="mt-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="flex min-h-11 items-center text-sm text-[color:var(--lp-muted)] transition-colors hover:text-[color:var(--lp-fg)] md:min-h-9"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="lp-muted mt-16 pb-8 text-center text-xs">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </Container>
    </footer>
  );
}