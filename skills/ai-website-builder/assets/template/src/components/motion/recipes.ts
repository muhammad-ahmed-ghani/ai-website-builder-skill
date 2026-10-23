/**
 * The six motion recipes. One id each; the builder names the recipe that carries the concept's signature moment with
 * `data-signature="<id>"` on its element, and the platform's `signature-present` gate checks that element exists in the built page
 * and really moves. Recipes live in this folder (components) and in src/index.css (the @utility and the data-attribute rules).
 */
export const MOTION_RECIPES = {
  reveal: { use: '<Reveal variant="rise|fade|clip">', what: "Content rises, fades or unmasks once when scrolled into view. `clip` unmasks a headline." },
  stagger: { use: "<Stagger as=\"ul\" step={60}>", what: "The children of a list or grid arrive one after another." },
  "count-up": { use: "<CountUp to={8} />", what: "A real figure ticks to its value once when first visible." },
  ticker: { use: "<Ticker items={[...]} />", what: "Marquee-free: one true fact at a time, cross-fading in place." },
  lift: { use: 'className="lift"', what: "Hover and focus lift (a few pixels and a shadow step) for cards and rows." },
  "view-transition": { use: "<Link to=...> (built in)", what: "Pages cross-fade when the visitor navigates; a named element can morph with view-transition-name." },
} as const;

export type MotionRecipeId = keyof typeof MOTION_RECIPES;
export const MOTION_RECIPE_IDS = Object.keys(MOTION_RECIPES) as MotionRecipeId[];
