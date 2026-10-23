import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fuzzyFilter, useHotkey } from "@/lib/app";
import { cn } from "@/lib/utils";
import { Kbd } from "./Kbd";

export interface PaletteItem {
  id: string;
  label: string;
  /** Quiet text at the end of the row ("Channel", "Ctrl K"). */
  hint?: string;
  /** Rows with the same group sit under one small heading. */
  group?: string;
  /** Extra words that find this item. */
  keywords?: string[];
  icon?: ReactNode;
  onSelect(): void;
}

export interface CommandPaletteProps {
  items: PaletteItem[];
  /** Controlled open state. Leave out and the palette opens and closes itself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  /** Shortcut that toggles the palette (default "mod+k"). */
  hotkey?: string;
  emptyText?: string;
}

interface Section {
  name: string | undefined;
  items: PaletteItem[];
}

function sectionsOf(results: readonly PaletteItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of results) {
    let section = sections.find((s) => s.name === item.group);
    if (!section) {
      section = { name: item.group, items: [] };
      sections.push(section);
    }
    section.items.push(item);
  }
  return sections;
}

/**
 * A search-and-jump dialog (Command or Ctrl + K). Fuzzy matches the label, hint and keywords, groups results, and is fully keyboard
 * driven: arrows, Home and End move, Enter chooses, Escape closes. It is a combobox over a listbox, built on the ui Dialog.
 */
export function CommandPalette({ items, open: openProp, onOpenChange, placeholder = "Type a command or search", hotkey = "mod+k", emptyText = "No results" }: CommandPaletteProps) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInner(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  useHotkey(hotkey, () => setOpen(!open));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-command-palette
        showCloseButton={false}
        className="top-[16%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Type to search. Use the up and down arrow keys to move, Enter to choose, Escape to close.</DialogDescription>
        <PaletteBody items={items} placeholder={placeholder} emptyText={emptyText} close={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({ items, placeholder, emptyText, close }: { items: PaletteItem[]; placeholder: string; emptyText: string; close: () => void }) {
  const uid = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const sections = useMemo(
    () => sectionsOf(fuzzyFilter(items, query, (item) => [item.label, ...(item.keywords ?? []), ...(item.hint ? [item.hint] : [])])),
    [items, query],
  );
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const current = flat.length === 0 ? -1 : Math.min(active, flat.length - 1);
  const optionId = (index: number) => `${uid}-option-${index}`;

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [current, flat]);

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    close();
    item.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const last = flat.length - 1;
    if (event.key === "ArrowDown") setActive(current >= last ? 0 : current + 1);
    else if (event.key === "ArrowUp") setActive(current <= 0 ? Math.max(last, 0) : current - 1);
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(Math.max(last, 0));
    else if (event.key === "Enter") choose(flat[current]);
    else return;
    event.preventDefault();
  };

  let index = -1;
  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          role="combobox"
          aria-label="Search"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={`${uid}-list`}
          aria-activedescendant={current >= 0 ? optionId(current) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-muted outline-none focus-visible:shadow-[inset_0_-2px_0_0_var(--color-focus)]"
        />
      </div>
      <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
        <div role="listbox" id={`${uid}-list`} aria-label="Results">
          {sections.map((section) => {
            const headingId = `${uid}-group-${section.name ?? "none"}`;
            return (
              <div key={section.name ?? "none"} role="group" aria-labelledby={section.name ? headingId : undefined}>
                {section.name ? (
                  <div id={headingId} className="px-2 pt-2 pb-1 text-xs font-medium text-muted">
                    {section.name}
                  </div>
                ) : null}
                {section.items.map((item) => {
                  index += 1;
                  const at = index;
                  return (
                    <div
                      key={item.id}
                      id={optionId(at)}
                      role="option"
                      aria-selected={at === current}
                      data-palette-item={item.id}
                      onMouseMove={() => {
                        if (at !== current) setActive(at);
                      }}
                      onClick={() => choose(item)}
                      className={cn("flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm text-fg aria-selected:bg-accent-soft")}
                    >
                      {item.icon ? (
                        <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center text-muted [&_svg]:size-4">
                          {item.icon}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint ? <span className="shrink-0 text-xs text-muted">{item.hint}</span> : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {flat.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">{emptyText}</p> : null}
        <p role="status" className="sr-only">
          {flat.length === 0 ? emptyText : `${flat.length} ${flat.length === 1 ? "result" : "results"}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Kbd>{"↑"}</Kbd>
          <Kbd>{"↓"}</Kbd>
          to move
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Enter</Kbd>
          to choose
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Esc</Kbd>
          to close
        </span>
      </div>
    </>
  );
}
