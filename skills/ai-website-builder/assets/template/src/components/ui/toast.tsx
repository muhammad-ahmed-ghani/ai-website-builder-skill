import { useSyncExternalStore, type ReactNode } from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Tiny toast system: call toast({ title, description }) from anywhere, render <Toaster /> once
 * (components/core/Layout.tsx already does). Built on the Radix Toast primitives so it is announced
 * to screen readers and dismissible with the keyboard (F8 jumps to the viewport).
 */

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-md border bg-bg p-4 pr-10 text-fg shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-slide-in-right",
  {
    variants: {
      variant: {
        default: "border-line",
        success: "border-success",
        danger: "border-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface ToastInput extends VariantProps<typeof toastVariants> {
  title?: ReactNode;
  description?: ReactNode;
  /** milliseconds; default 5000 */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: string;
}

const EMPTY: ToastItem[] = [];
let items: ToastItem[] = EMPTY;
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Show a toast. Returns its id. */
export function toast(input: ToastInput): string {
  const id = `toast-${++counter}`;
  items = [...items, { id, ...input }];
  emit();
  return id;
}

/** Dismiss one toast by id, or all of them. */
export function dismissToast(id?: string) {
  items = id ? items.filter((item) => item.id !== id) : EMPTY;
  emit();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
}

export function Toaster() {
  const list = useToasts();
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {list.map(({ id, title, description, variant, duration, action }) => (
        <ToastPrimitive.Root
          key={id}
          data-slot="toast"
          type={variant === "danger" ? "foreground" : "background"}
          duration={duration}
          className={toastVariants({ variant })}
          onOpenChange={(open) => {
            if (!open) dismissToast(id);
          }}
        >
          <div className="grid gap-1">
            {title ? <ToastPrimitive.Title className="text-sm font-medium">{title}</ToastPrimitive.Title> : null}
            {description ? (
              <ToastPrimitive.Description className="text-sm text-muted">{description}</ToastPrimitive.Description>
            ) : null}
          </div>
          {action ? (
            <ToastPrimitive.Action altText={action.label} asChild>
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex h-8 shrink-0 items-center rounded-md border border-line px-3 text-sm font-medium transition-colors duration-(--duration-fast) hover:bg-surface"
              >
                {action.label}
              </button>
            </ToastPrimitive.Action>
          ) : null}
          <ToastPrimitive.Close
            aria-label="Dismiss"
            className={cn(
              "absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors duration-(--duration-fast) hover:bg-surface hover:text-fg",
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-50 flex max-h-dvh w-full flex-col gap-2 p-4 outline-none sm:max-w-sm" />
    </ToastPrimitive.Provider>
  );
}
