import { Heading, Section, Seo } from "@/components/core";

/**
 * PLACEHOLDER home page. Replace it: compose sections from src/sections/home/* inside this file,
 * keep exactly one <Seo> and exactly one level-1 Heading.
 */
export function Home() {
  return (
    <>
      <Seo description="A new app, not yet written. This placeholder page is replaced as the app is built." />
      <Section id="start" aria-labelledby="home-title">
        <Heading level={1} id="home-title">
          Replace me
        </Heading>
        <p className="mt-4 max-w-prose text-lg text-muted">
          Replace me: this page is a placeholder and carries no real content yet.
        </p>
      </Section>
    </>
  );
}
