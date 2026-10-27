/**
 * Self-test for scripts/lint.ts. Run `node scripts/lint.test.ts` (exits 1 on a failure). Independent of the app's own files:
 * every fixture is a string below. Each bad fixture must trip exactly its own rule, and a `lint-ok: <rule> <reason>` waiver must silence it.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyWaivers, lintFileContent, lintProject, type Finding } from "./lint.ts";

type Sev = "error" | "warn";
const bad: Array<{ rule: string; sev: Sev; file: string; code: string }> = [
  { rule: "transition-all", sev: "error", file: "src/components/A.tsx", code: `export const A = () => <div className="transition-all duration-200" />;` },
  { rule: "animated-layout", sev: "error", file: "src/a.css", code: `.card { transition: width 200ms ease; }` },
  { rule: "animated-layout", sev: "warn", file: "src/b.css", code: `.card { transition: padding 200ms ease; }` },
  { rule: "outline-removed", sev: "error", file: "src/components/B.tsx", code: `export const B = () => <input className="outline-none px-2" />;` },
  { rule: "viewport-width", sev: "error", file: "src/components/C.tsx", code: `export const C = () => <div className="w-screen" />;` },
  { rule: "vh-height", sev: "error", file: "src/components/D.tsx", code: `export const D = () => <section className="min-h-screen" />;` },
  { rule: "overflow-x-hidden", sev: "error", file: "src/c.css", code: `body { overflow-x: hidden; }` },
  { rule: "sticky-top-0", sev: "warn", file: "src/components/E.tsx", code: `export const E = () => <><header className="sticky top-0" /><nav className="sticky top-0" /></>;` },
  { rule: "raw-z-index", sev: "warn", file: "src/components/F.tsx", code: `export const F = () => <div className="z-[9999]" />;` },
  { rule: "emoji-icon", sev: "error", file: "src/components/G.tsx", code: `export const G = () => <span>\u{1F680}</span>;` },
  { rule: "decorative-svg", sev: "warn", file: "src/components/H.tsx", code: `export const H = () => <svg viewBox="0 0 1 1"><path d="M0 0" /></svg>;` },
  { rule: "button-type", sev: "warn", file: "src/components/I.tsx", code: `export const I = () => <button onClick={() => {}}>Go</button>;` },
  { rule: "autoplay-unmuted", sev: "error", file: "src/components/immersive/V.tsx", code: `export const V = () => <video autoPlay loop src="/a.mp4" />;` },
  { rule: "reveal-hidden", sev: "warn", file: "src/d.css", code: `.reveal { opacity: 0; }` },
  { rule: "fake-send", sev: "warn", file: "src/components/J.tsx", code: `export const J = () => <form onSubmit={(e) => e.preventDefault()}><p>Thanks, your message was sent.</p></form>;` },
];

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  (${detail})`}`);
};
const rulesOf = (found: Finding[]) => [...new Set(found.map((f) => f.rule))].sort().join(",");

for (const { rule, sev, file, code } of bad) {
  const found = lintFileContent(file, code);
  const got = found.filter((f) => f.rule === rule);
  check(`${rule} (${sev}) trips exactly itself`, rulesOf(found) === rule && got.every((f) => (f.severity ?? "error") === sev), `got: ${rulesOf(found) || "nothing"}`);
  const first = found[0]?.line ?? 1;
  const lines = code.split("\n");
  lines.splice(first - 1, 0, `// lint-ok: ${rule} the fixture needs it`);
  const withWaiver = lines.join("\n");
  const waived = applyWaivers(lintFileContent(file, withWaiver), new Map([[file, withWaiver]]));
  check(`${rule} is silenced by a waiver`, waived.length === 0, `still: ${rulesOf(waived)}`);
}

// Near misses that must stay quiet: the safe form of every rule above.
const clean = `export const Ok = () => (<>
  <main tabIndex={-1} className="focus:outline-none min-h-dvh" />
  <input className="outline-none focus-visible:ring-2" />
  <div className="max-md:invisible transition-colors z-40 max-w-[85vw] sticky top-0" />
  <svg aria-hidden="true" viewBox="0 0 1 1" /><button type="button">Go</button><video autoPlay muted loop />
  <p>Your message was not sent. Try again.</p><form onSubmit={() => fetch("/api")}><p>Thanks, sent.</p></form>
</>);`;
check("the safe forms trip nothing", lintFileContent("src/components/immersive/Ok.tsx", clean).length === 0, rulesOf(lintFileContent("src/components/immersive/Ok.tsx", clean)));
check("transition: opacity and an html overflow-x: clip are fine", lintFileContent("src/e.css", "a { transition: opacity 200ms; }\nhtml { overflow-x: clip; }").length === 0);

// Project-level rules, the waiver rules and the copy pass need real files: build a tiny project and lint it.
const makeProject = (files: Record<string, string>) => {
  const root = mkdtempSync(path.join(tmpdir(), "lint-test-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), text);
  }
  return root;
};
const project = (files: Record<string, string>) => {
  const root = makeProject(files);
  try {
    return lintProject(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

check("reduced-motion: animation with no media query is an error", rulesOf(project({ "src/m.css": "@keyframes spin { to { opacity: 1; } }" })) === "reduced-motion");
check("reduced-motion: satisfied by a prefers-reduced-motion block", project({ "src/m.css": "@keyframes spin { to { opacity: 1; } }\n@media (prefers-reduced-motion: reduce) { * { animation: none; } }" }).length === 0);
check("index.html: overflow-x-hidden on body is an error", rulesOf(project({ "src/x.css": ".a { color: inherit; }", "index.html": `<body class="overflow-x-hidden"></body>` })) === "overflow-x-hidden");

const calm = { "src/m.css": "@media (prefers-reduced-motion: reduce) { * { animation: none; } }" };
const noReason = project({ ...calm, "src/components/K.tsx": `export const K = () => <div className="transition-all" />; // lint-ok: transition-all` });
check("a waiver with no reason still silences but warns (lint-waiver)", rulesOf(noReason) === "lint-waiver" && noReason[0]?.severity === "warn");
const unused = project({ ...calm, "src/components/L.tsx": `export const L = () => <div className="p-2" />; // lint-ok: emoji-icon not needed here` });
check("a waiver that silences nothing warns (lint-waiver-unused)", rulesOf(unused) === "lint-waiver-unused");

const tells = JSON.stringify({ version: 1, residue: ["hope this helps"], placeholders: ["jane doe"], words: ["delve"], phrases: ["a testament to"], patterns: [{ id: "no-em-dash", regex: "\\u2014", flags: "g", severity: "error", note: "Em dash." }, { id: "not-just", regex: "\\bnot just\\b", flags: "gi", severity: "warn", note: "Cadence." }] });
const copy = project({
  "scripts/copy-tells.json": tells,
  "src/pages/P.tsx": `<Seo />\nexport const P = () => <main><p>Hope this helps.</p><p>Jane Doe</p><p>We delve into it.</p><p>A testament to craft.</p><p>Fast \u2014 simple.</p><p>It is not just a tool.</p></main>;`,
});
const byRule = (r: string) => copy.find((f) => f.rule === r);
const expectSev: Record<string, Sev> = { "copy-residue": "error", "copy-placeholder": "error", "copy-word": "warn", "copy-phrase": "warn", "copy-no-em-dash": "error", "copy-not-just": "warn" };
for (const [rule, sev] of Object.entries(expectSev)) check(`${rule} is a ${sev}`, byRule(rule)?.severity === sev, `got ${byRule(rule)?.severity ?? "nothing"}`);
check("no copy-tells.json: the copy pass is skipped without error", project({ "src/pages/P.tsx": `<Seo />\nexport const P = () => <p>Jane Doe</p>;` }).length === 0);

console.log(failures === 0 ? "\nlint.test: all passed" : `\nlint.test: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
