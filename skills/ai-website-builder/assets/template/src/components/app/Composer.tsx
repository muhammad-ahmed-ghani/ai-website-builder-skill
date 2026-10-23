import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "./Kbd";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface ComposerProps {
  /** Called with the trimmed text. The field then clears and keeps focus. */
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Name of the textarea (default "message"). */
  name?: string;
  maxLength?: number;
  /** Screen-reader label of the field (default "Message"). */
  label?: string;
  /** Show the "Enter to send" line (default true). */
  hint?: boolean;
}

/**
 * The message box of a chat: Enter sends, Shift+Enter adds a line, it grows to about eight lines, ignores Enter while an input
 * method is composing and never sends blank text. A real form with a real onSubmit.
 */
export function Composer({ onSend, placeholder = "Write a message", disabled = false, name = "message", maxLength, label = "Message", hint = true }: ComposerProps) {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const blank = value.trim() === "";

  // Grow with the text. The CSS max-height stops it at about eight lines and then it scrolls.
  useIsoLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }, [value]);

  const send = () => {
    const text = value.trim();
    if (disabled || !text) return;
    onSend(text);
    setValue("");
    field.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    send();
  };

  return (
    <form
      data-composer
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        send();
      }}
      className="shrink-0 border-t border-line bg-bg p-3"
    >
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="flex items-end gap-2">
        <Textarea
          ref={field}
          id={id}
          name={name}
          rows={1}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          className="max-h-48 min-h-10 resize-none py-2"
        />
        <Button type="submit" size="icon" aria-label="Send message" disabled={disabled || blank}>
          <Send aria-hidden="true" className="rtl:-scale-x-100" />
        </Button>
      </div>
      {hint ? (
        <p className="mt-1.5 hidden text-xs text-muted sm:block">
          <Kbd>Enter</Kbd> to send, <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line
        </p>
      ) : null}
    </form>
  );
}
