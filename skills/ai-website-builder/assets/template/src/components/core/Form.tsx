import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isFormsConfigured, mailtoFor, submitForm, type FormValue, type SubmitResult } from "@/lib/form";

export interface FormField {
  /** The key in the submission and the input's name. Letters, digits, spaces, `_ . - : /` only. */
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "number" | "date" | "textarea" | "select" | "checkbox";
  required?: boolean;
  placeholder?: string;
  /** Choices for `select`. */
  options?: string[];
  /** Short help shown under the field. */
  hint?: string;
  autoComplete?: string;
}

/** Everything the visitor reads, in the app's own voice. Defaults are plain and make no promise the app cannot keep. */
export interface FormMessages {
  success: string;
  /** The relay or the server failed: the message was not sent. */
  error: string;
  /** The visitor is offline or the request never completed: the message was not sent. */
  offline: string;
  rateLimited: string;
  /** This build has no relay address: nothing can be sent. */
  notConfigured: string;
  /** Label of the submit button while sending. */
  sending: string;
  /** Label of the mailto link offered when the message could not be sent and `fallbackEmail` is set. */
  emailInstead: string;
  /** Label of the button that returns from the success message to an empty form. Omit to hide it. */
  again: string;
}

const DEFAULTS: FormMessages = {
  success: "Thanks, your message was sent.",
  error: "Something went wrong and your message was not sent. Please try again.",
  offline: "You seem to be offline, so your message was not sent. Check your connection and try again.",
  rateLimited: "Too many attempts in a short time. Please wait a moment and try again.",
  notConfigured: "This form is not connected yet, so nothing was sent.",
  sending: "Sending...",
  emailInstead: "Email us instead",
  again: "",
};

export interface FormProps {
  /** "contact", "booking", "waitlist": the owner sees it next to each submission. */
  name: string;
  fields: FormField[];
  submitLabel: string;
  messages?: Partial<FormMessages>;
  /** The client's own email. When a send fails, the visitor is offered a mailto with what they typed. Never invent one. */
  fallbackEmail?: string;
  /** Override the relay address. Only for a client who runs their own endpoint and said so. */
  endpoint?: string;
  onSuccess?: () => void;
  className?: string;
}

const control = "h-10 w-full min-w-0 rounded-md border border-line bg-bg px-3 text-base text-fg transition-colors duration-(--duration-fast) disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";

function readFields(form: HTMLFormElement, fields: FormField[]): Record<string, FormValue> {
  const data = new FormData(form);
  const out: Record<string, FormValue> = {};
  for (const f of fields) {
    if (f.type === "checkbox") out[f.name] = data.get(f.name) !== null;
    else out[f.name] = String(data.get(f.name) ?? "").trim();
  }
  const trap = String(data.get("_gotcha") ?? "");
  if (trap) out._gotcha = trap;
  return out;
}

/**
 * A form that really submits: to the platform relay (stored for the app's owner, spam-filtered, rate limited). It shows its own sending,
 * success, error and offline states in `messages`, keeps what the visitor typed when a send fails, and, when `fallbackEmail` is given,
 * offers a mailto with their text so a failure never loses the message. Do not write a form against any other endpoint.
 */
export function Form({ name, fields, submitLabel, messages, fallbackEmail, endpoint, onSuccess, className }: FormProps) {
  const uid = useId();
  const m = { ...DEFAULTS, ...messages };
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [result, setResult] = useState<Extract<SubmitResult, { ok: false }> | null>(null);
  const [typed, setTyped] = useState<Record<string, FormValue>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "sending") return;
    const values = readFields(event.currentTarget, fields);
    setTyped(values);
    setPhase("sending");
    const r = await submitForm(values, { form: name, ...(endpoint ? { endpoint } : {}) });
    if (r.ok) {
      setPhase("sent");
      onSuccess?.();
    } else {
      setResult(r);
      setPhase("failed");
    }
  }

  if (phase === "sent") {
    return (
      <div role="status" className={cn("grid gap-3 rounded-md border border-line bg-surface p-4 text-fg", className)}>
        <p>{m.success}</p>
        {m.again ? (
          <div>
            <Button variant="outline" onClick={() => setPhase("idle")}>
              {m.again}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const problem = result && phase === "failed" ? (result.reason === "offline" ? m.offline : result.reason === "rate_limited" ? m.rateLimited : result.reason === "not_configured" ? m.notConfigured : m.error) : "";
  const sending = phase === "sending";

  return (
    <form onSubmit={onSubmit} className={cn("grid gap-4", className)} aria-busy={sending} data-form={name}>
      {fields.map((f) => {
        const id = `${uid}-${f.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        const hintId = f.hint ? `${id}-hint` : undefined;
        const common = { id, name: f.name, required: f.required ?? false, "aria-describedby": hintId, disabled: sending, defaultValue: typeof typed[f.name] === "string" ? (typed[f.name] as string) : undefined };
        if (f.type === "checkbox") {
          return (
            <div key={f.name} className="flex items-start gap-3">
              <input type="checkbox" id={id} name={f.name} required={f.required ?? false} disabled={sending} defaultChecked={typed[f.name] === true} aria-describedby={hintId} className="mt-1 size-4 accent-accent" />
              <div className="grid gap-1">
                <Label htmlFor={id}>{f.label}</Label>
                {f.hint ? <p id={hintId} className="text-sm text-muted">{f.hint}</p> : null}
              </div>
            </div>
          );
        }
        return (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={id}>
              {f.label}
              {f.required ? <span className="text-muted"> (required)</span> : null}
            </Label>
            {f.type === "textarea" ? (
              <Textarea {...common} placeholder={f.placeholder} autoComplete={f.autoComplete} rows={5} />
            ) : f.type === "select" ? (
              <select {...common} className={control}>
                <option value="">{f.placeholder ?? "Choose one"}</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <Input {...common} type={f.type ?? "text"} placeholder={f.placeholder} autoComplete={f.autoComplete ?? (f.type === "email" ? "email" : f.type === "tel" ? "tel" : f.name === "name" ? "name" : undefined)} />
            )}
            {f.hint ? <p id={hintId} className="text-sm text-muted">{f.hint}</p> : null}
          </div>
        );
      })}

      {/* A trap for bots: invisible and unreachable for people, filled in by scripts that fill every input. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this empty
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={sending}>
          {sending ? m.sending : submitLabel}
        </Button>
        {!isFormsConfigured() && !endpoint && phase === "idle" ? <p className="text-sm text-muted">{m.notConfigured}</p> : null}
      </div>

      <div aria-live="polite">
        {problem ? (
          <div role="alert" className="grid gap-2 rounded-md border border-danger bg-surface p-4 text-fg">
            <p>
              {problem}
              {result?.reason === "invalid" && result.message ? ` (${result.message})` : ""}
            </p>
            {fallbackEmail ? (
              <p>
                <a className="underline underline-offset-4" href={mailtoFor(fallbackEmail, name, typed)}>
                  {m.emailInstead}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}
