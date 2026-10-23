/**
 * Replaced by the platform whenever immersive media is made (the `immersive_make` tool): do not edit. One entry per made scene, shaped
 * for the kit's components, so the poster and the sizes are in the server-rendered markup:
 *   <ScrubFrames {...immersive["film"]} screens={6}> ...beats... </ScrubFrames>
 *   <LoopVideo {...immersive["hero-loop"]} />   <CutOut {...immersive["skull"]} edge="end" />   <Mascot {...immersive["fox"]} />
 * The files are in public/assets/immersive/<id>/ with a manifest.json; the entries here mirror what a page needs from it.
 */
import type { ImmersiveEntries } from "@/components/immersive/types";

export const immersive = {} satisfies ImmersiveEntries;
