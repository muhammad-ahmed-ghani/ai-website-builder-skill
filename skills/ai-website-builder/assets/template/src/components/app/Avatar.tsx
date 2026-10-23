import { initials } from "@/lib/app";
import { cn } from "@/lib/utils";

const TONES = ["bg-accent-soft", "bg-secondary-soft", "bg-surface-2"] as const;

const SIZES = {
  sm: "size-6 text-xs",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

const STATUS = {
  online: { dot: "bg-success", label: "Online" },
  away: { dot: "bg-warning", label: "Away" },
  offline: { dot: "bg-muted", label: "Offline" },
} as const;

/** The same name always gets the same tone. */
function toneFor(name: string): (typeof TONES)[number] {
  let hash = 0;
  for (const ch of name) hash = (Math.imul(hash, 31) + (ch.codePointAt(0) ?? 0)) >>> 0;
  return TONES[hash % TONES.length] ?? TONES[0];
}

export interface AvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  status?: keyof typeof STATUS;
  className?: string;
}

/** Initials on a token tone picked from the name. The name is expected next to it in text; the status has a text alternative. */
export function Avatar({ name, size = "md", status, className }: AvatarProps) {
  return (
    <span
      data-avatar
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full font-medium text-fg", toneFor(name), SIZES[size], className)}
    >
      <span aria-hidden="true">{initials(name)}</span>
      {status ? (
        <>
          <span
            data-avatar-status={status}
            aria-hidden="true"
            className={cn("absolute end-0 bottom-0 size-2.5 rounded-full border-2 border-bg", STATUS[status].dot)}
          />
          <span className="sr-only">{STATUS[status].label}</span>
        </>
      ) : null}
    </span>
  );
}
