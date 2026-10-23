import type { ComponentProps } from "react";
import { withBase } from "@/lib/base";
import { cn } from "@/lib/utils";

const ratios = {
  square: "aspect-square",
  video: "aspect-video",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "3/4": "aspect-[3/4]",
  "2/3": "aspect-[2/3]",
  "21/9": "aspect-[21/9]",
} as const;

export type ImgRatio = keyof typeof ratios;

/** One `<source>` of a responsive image: a MIME type and the `srcset` that goes with it (see src/lib/assets.ts). */
export interface ImgSource {
  type: string;
  srcSet: string;
}

export interface ImgProps extends Omit<ComponentProps<"img">, "alt" | "width" | "height" | "src" | "className"> {
  src: string;
  /** Required. Describe the image for someone who cannot see it, or pass "" for purely decorative images. */
  alt: string;
  /** Intrinsic pixel size of the file. Reserves space so the page does not jump while loading. */
  width: number;
  height: number;
  /** Responsive sources (avif, webp). Spread `assets["id"]` and they arrive with the file: `<Img {...assets["hero"]} priority />`. */
  sources?: ImgSource[];
  /**
   * How wide the image is drawn, for the browser's choice among the srcset widths. A CSS length list such as
   * "(min-width: 1024px) 50vw, 100vw". Default "100vw": say so when the picture is narrower, or phones download too much.
   */
  sizes?: string;
  /** Tiny blurred preview (a data URI) shown behind the image until it arrives. Comes with `assets["id"]`. */
  blur?: string;
  /** Crop to a fixed ratio instead of the file's own. */
  ratio?: ImgRatio;
  /** Object fit inside the box. */
  fit?: "cover" | "contain";
  /** true for the one image that is the Largest Contentful Paint (usually the hero): eager and high priority. Everything else lazy-loads. */
  priority?: boolean;
  /** Classes for the outer box (size, radius, margins). */
  className?: string;
  /** Classes for the <img> itself. */
  imgClassName?: string;
}

const withBaseSet = (set: string): string => set.replace(/(^|,\s*)(\/(?!\/)[^\s,]+)/g, (_m, lead: string, url: string) => `${lead}${withBase(url)}`);

/**
 * The only way to put an image on a page. Reserves its box (width and height become an aspect ratio, so nothing shifts),
 * serves the smallest sufficient file in the best format (<picture> with avif/webp sources and a width-based srcset),
 * lazy-loads below the fold, and demands alt text. `priority` is for the single LCP image: eager, fetchpriority high.
 * Files live in public/assets and are referenced as "/assets/name.webp"; the platform writes the responsive variants.
 */
export function Img({
  src,
  alt,
  width,
  height,
  sources,
  sizes = "100vw",
  blur,
  ratio,
  fit = "cover",
  priority = false,
  className,
  imgClassName,
  srcSet,
  ...props
}: ImgProps) {
  const img = (
    <img
      src={withBase(src)}
      {...(srcSet ? { srcSet: withBaseSet(srcSet), sizes } : {})}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain", imgClassName)}
      {...props}
    />
  );
  const style = {
    ...(ratio ? {} : { aspectRatio: `${width} / ${height}` }),
    ...(blur ? { backgroundImage: `url("${blur}")`, backgroundSize: "cover" } : {}),
  };
  return (
    <div className={cn("overflow-hidden bg-surface-2", ratio && ratios[ratio], className)} style={Object.keys(style).length ? style : undefined}>
      {sources?.length ? (
        <picture className="contents">
          {sources.map((s) => (
            <source key={s.type} type={s.type} srcSet={withBaseSet(s.srcSet)} sizes={sizes} />
          ))}
          {img}
        </picture>
      ) : (
        img
      )}
    </div>
  );
}
