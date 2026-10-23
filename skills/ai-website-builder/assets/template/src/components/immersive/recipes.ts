import type { ImmersiveRecipe } from "./types";

/**
 * The seven immersive recipes. Same contract as the six motion recipes (src/components/motion/recipes.ts): the builder names the one that
 * carries the concept's signature moment with `data-signature="<id>"` (the components set it themselves), and the platform's
 * `signature-present` gate checks it exists in the built home page. Use at most one per page unless the brief calls for more; most apps use none.
 */
export const IMMERSIVE_RECIPES = {
  "scrub-film": { use: '<ScrubVideo {...immersive["id"]} screens={5}>', what: "One muted video whose time follows the scroll through a pinned runway. Whole file preloaded behind a Preloader." },
  "scrub-frames": { use: '<ScrubFrames {...immersive["id"]} screens={6}>', what: "A frame sequence drawn on a canvas by scroll progress. Key frames first, a smaller set for phones." },
  "pinned-chapters": { use: '<Runway id label screens={5}> <Beat from to> <Chapters chapters>', what: "A pinned stage with text beats keyed to scroll ranges and chapter links that scroll to marks." },
  "shader-hero": { use: '<ShaderHero id label fallback shader="flow">', what: "A small WebGL fragment shader behind the hero, with a static fallback, throttled and off when out of view." },
  "cutout-depth": { use: '<CutOut {...immersive["id"]} depth={0.6} edge="end">', what: "A transparent cut-out layered over a section, crossing into the next, drifting with pointer and scroll." },
  mascot: { use: '<Mascot {...immersive["id"]} />', what: "An animated vector character whose named parts move with CSS only; a still pose is the fallback." },
  "loop-hero": { use: '<LoopVideo {...immersive["id"]} fill>', what: "A muted looping video behind a hero, poster first, paused off screen and under reduced motion." },
} as const satisfies Record<ImmersiveRecipe, { use: string; what: string }>;

export const IMMERSIVE_RECIPE_IDS = Object.keys(IMMERSIVE_RECIPES) as ImmersiveRecipe[];
