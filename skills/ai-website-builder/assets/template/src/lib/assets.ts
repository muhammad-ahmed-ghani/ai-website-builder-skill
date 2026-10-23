/**
 * Replaced by the platform whenever generated images change: do not edit. Every planned image has an entry shaped for <Img/>:
 *   <Img {...assets["hero"]} sizes="100vw" priority />
 * `sources` (avif and webp, several widths), `width`/`height` of the fallback file and a tiny `blur` preview are written by the
 * platform's image optimiser, so spreading the entry gives responsive, shift-free images for free. Pass `sizes` when the picture is
 * narrower than the viewport. Entries for images that could not be generated point at a neutral placeholder and are listed in `missingAssets`.
 */
export interface Asset {
  src: string;
  alt: string;
  width: number;
  height: number;
  sources?: { type: string; srcSet: string }[];
  blur?: string;
}

export const assets = {} satisfies Record<string, Asset>;

export const missingAssets: string[] = [];
