import { Heading, Link, Section, Seo } from "@/components/core";
import { buttonVariants } from "@/components/ui/button";

/** Rendered for unknown URLs and written to dist/404.html at build time. */
export function NotFound() {
  return (
    <>
      <Seo title="Page not found" description="The page you asked for does not exist or has moved." noindex />
      <Section aria-labelledby="not-found-title">
        <Heading level={1} id="not-found-title">
          Page not found
        </Heading>
        <p className="mt-4 max-w-prose text-lg text-muted">The page you asked for does not exist or has moved.</p>
        <Link to="/" className={buttonVariants({ className: "mt-8" })}>
          Back to the home page
        </Link>
      </Section>
    </>
  );
}
