/**
 * The platform form relay, from the browser: one function every form uses.
 *
 * An app's forms post to `VITE_FORMS_URL` (`<platform>/f/<app id>`), which the platform fills in for the preview and the published
 * app. The relay stores the submission for the app's owner, rate limits and filters spam. Do not post a form anywhere else: third-party
 * form services (formsubmit, formspree, getform, web3forms, ...) send visitors' personal data to a company the owner never chose, and the
 * platform's checks fail an app that does it.
 *
 * `submitForm` never throws. It answers `{ ok: true }` or `{ ok: false, reason }`, and the reason is what the UI words in the app's voice:
 *   not_configured  no relay address in this build (a local build without the platform's variables)
 *   offline         the visitor is offline or the network failed: the message was NOT sent
 *   rate_limited    too many attempts from this visitor
 *   invalid         the relay refused the content (empty, too long); `message` says why
 *   disabled        the owner switched this form off, or the app is unknown to the platform
 *   server          anything else
 */

export type FormValue = string | number | boolean | string[];

export type SubmitResult =
  | { ok: true; id?: string }
  | { ok: false; reason: "not_configured" | "offline" | "rate_limited" | "invalid" | "disabled" | "server"; message?: string; retryAfterSeconds?: number };

export interface SubmitOptions {
  /** Override the relay address (tests, or a client who runs their own endpoint and said so). Default: VITE_FORMS_URL. */
  endpoint?: string;
  /** The form's name ("contact", "booking", "waitlist"): lets the owner tell forms apart in their inbox. */
  form?: string;
  signal?: AbortSignal;
  /** Test seam. */
  fetchImpl?: typeof fetch;
}

/** The relay address this build was given, or "". */
export function formsEndpoint(): string {
  return (import.meta.env.VITE_FORMS_URL ?? "").trim();
}

export function isFormsConfigured(): boolean {
  return formsEndpoint() !== "";
}

export async function submitForm(fields: Record<string, FormValue>, options: SubmitOptions = {}): Promise<SubmitResult> {
  const endpoint = (options.endpoint ?? formsEndpoint()).trim();
  if (!endpoint) return { ok: false, reason: "not_configured" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, reason: "offline" };
  const doFetch = options.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ ...fields, ...(options.form ? { _form: options.form } : {}) }),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch {
    return { ok: false, reason: "offline" }; // the request never completed: nothing was sent
  }
  if (res.ok) {
    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, ...(body?.id ? { id: body.id } : {}) };
  }
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  const message = body?.error?.message;
  if (res.status === 429) {
    const wait = Number(res.headers.get("retry-after"));
    return { ok: false, reason: "rate_limited", ...(Number.isFinite(wait) && wait > 0 ? { retryAfterSeconds: wait } : {}) };
  }
  if (res.status === 400 || res.status === 413 || res.status === 415 || res.status === 422) return { ok: false, reason: "invalid", ...(message ? { message } : {}) };
  if (res.status === 403 || res.status === 404) return { ok: false, reason: "disabled", ...(message ? { message } : {}) };
  return { ok: false, reason: "server", ...(message ? { message } : {}) };
}

/** A `mailto:` link that carries what the visitor typed, for when the relay cannot be reached. */
export function mailtoFor(email: string, subject: string, fields: Record<string, FormValue>): string {
  const body = Object.entries(fields)
    .filter(([k, v]) => !k.startsWith("_") && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
