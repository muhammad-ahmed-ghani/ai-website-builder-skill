/**
 * The immersive kit: components for ONE signature moment that a concept's brief really calls for (a film that scrubs with the scroll, a
 * frame sequence, a looping hero, a shader, layered cut-outs, an animated character). Most apps use none of it, and an app that does not
 * import it pays nothing: the heavy parts (frame, video and shader engines) are separate chunks that load after hydration.
 * See AGENTS.md section 13 and the `immersive` skill.
 */
export { CutOut, type CutOutProps } from "./CutOut";
export { LoopVideo, type LoopVideoProps } from "./LoopVideo";
export { Mascot, parseMascotSvg, type MascotProps } from "./Mascot";
export { IMMERSIVE_RECIPES, IMMERSIVE_RECIPE_IDS } from "./recipes";
export { Preloader, type PreloaderProps } from "./Preloader";
export { Beat, Chapters, Runway, recipeFor, useRunway, type BeatProps, type Chapter, type ChaptersProps, type RunwayContextValue, type RunwayProps } from "./Runway";
export { ScrubFrames, type ScrubFramesProps } from "./ScrubFrames";
export { ScrubVideo, type ScrubVideoProps } from "./ScrubVideo";
export { ShaderHero, type ShaderHeroProps } from "./ShaderHero";
export { allowsMotionMedia, readMediaPolicy, wantsSmallVariant, type MediaPolicy } from "./policy";
export type { CutOutEntry, SceneApi, FrameSet, FramesEntry, ImmersiveEntries, ImmersiveEntry, ImmersivePoster, ImmersiveRecipe, LoopVideoEntry, MascotBehaviour, MascotEntry, SceneInfo, SceneKind, ScrubVideoEntry } from "./types";
