import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Long-form text (articles, policies). Styles plain h2/h3/p/ul/ol/a/blockquote/code/hr/img descendants
 * from tokens, so content can be written as normal markup. Inherits the surrounding text colour.
 */
export function Prose({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "max-w-prose text-base",
        "[&>*+*]:mt-4",
        "[&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-balance",
        "[&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-balance",
        "[&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-muted",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li+li]:mt-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_blockquote]:text-muted",
        "[&_code]:rounded-sm [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm",
        "[&_hr]:my-8 [&_hr]:border-line",
        "[&_img]:rounded-md",
        className,
      )}
      {...props}
    />
  );
}
