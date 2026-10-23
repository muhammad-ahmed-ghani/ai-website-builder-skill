/**
 * Example: a screen of a product nobody signs in to (copy the idea, not the file; it is not part of the starter's type check).
 * accounts.ts exports an empty list, there is no AuthGate and no sign-in route, and the shell hides the account menu.
 * Data lives in the browser through `store` (seeded by seed.ts, persisted, synced across tabs). One <h1>. Real Seo.
 */
import { store } from "@/app/db"; // importing it is what makes the app exist
import { AppShell, EmptyState } from "@/components/app";
import { Heading, Seo } from "@/components/core";
import { useCollection } from "@/lib/app";

export function Lessons() {
  const lessons = useCollection(store, "lessons"); // seed.ts returned { lessons: [...] }
  return (
    <>
      <Seo title="Lessons: English with Urdu beside every line" description="Short English lessons with the Urdu translation beside every line, practice checked on the spot, and progress kept in your browser." />
      <AppShell title="Sabaq" account={false}>
        <div className="p-6">
          <Heading level={1}>Lessons</Heading>
          {lessons.length === 0 ? (
            <EmptyState title="No lessons yet" description="Start with the first one." />
          ) : (
            <ul className="mt-4 space-y-2">
              {lessons.map((l) => (
                <li key={l.id} className="rounded-md border border-line bg-surface p-3">
                  {/* a line in another script gets its own language and direction, whatever the page direction is */}
                  <span className="font-display">{l.title}</span> <span lang="ur" dir="rtl">{l.urdu}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppShell>
    </>
  );
}
// routes.tsx: { path: "/lessons", Component: Lessons, chrome: "app" }
