/**
 * AI rail client: the stock @fal-ai/client pointed at a gateway you run.
 *
 * HOW IT WORKS
 *  - The browser never talks to Fal. Every call goes to VITE_AI_URL (the platform gateway), which
 *    authenticates the app key, enforces this app's capability manifest (allowed endpoint ids, ceilings),
 *    reserves credits, forwards to Fal with the platform's own key, settles, and refunds on failure.
 *  - The client config is exactly Fal's documented proxy mode:
 *      fal.config({ proxyUrl: { url: VITE_AI_URL, when: "always" }, credentials: VITE_AI_APP_KEY })
 *    We build per-end-user clients with createFalClient() (same options) so the optional x-end-user header
 *    can differ per call without mutating global state. Use getFalClient() if you need the raw client
 *    (storage.upload, streaming, realtime), or configureFalSingleton() if you prefer the stock `fal` singleton.
 *
 * ABOUT VITE_AI_APP_KEY (read this before "fixing" it)
 *  It is NOT a Fal key. It is a platform-minted, scope-limited app key built to live in the client bundle:
 *  it only works against the rail, only for the endpoints in this app's capability manifest, and the rail
 *  enforces per-day and per-end-user caps and a credit ceiling server-side. Leaking it exposes at most those
 *  capped capabilities, never an account. A raw FAL_KEY or any provider key must NEVER appear in this project
 *  (the platform blocks writes that put one in a file).
 *
 * INERT WITHOUT ENV
 *  If either variable is missing, nothing is imported or sent. Every helper rejects with an AiError whose
 *  code is "not_configured", and isAiConfigured() returns false so UI can hide AI features.
 *
 * The Fal client is loaded with a dynamic import, so pages that never call AI do not download it.
 */

import type { FalClient, QueueStatus } from "@fal-ai/client";

// ---------------------------------------------------------------- errors

export type AiErrorCode =
  | "not_configured"
  | "insufficient_credits" // 402
  | "endpoint_not_allowed" // 403
  | "daily_cap" // 429, *_daily_cap
  | "rate_limited" // 429, rate_limited
  | "unauthorized" // 401
  | "invalid_input" // 422
  | "aborted"
  | "network"
  | "upstream" // 5xx
  | "unknown";

export interface AiErrorInit {
  code: AiErrorCode;
  /** Developer-facing detail (logged, never shown to visitors). */
  message: string;
  /** Visitor-facing sentence. Always safe to render. */
  userMessage: string;
  status?: number;
  requestId?: string;
  retryAfterSeconds?: number;
  /** Raw error code string from the rail, for example "end_user_daily_cap". */
  railCode?: string;
  cause?: unknown;
}

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly userMessage: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;
  readonly retryAfterSeconds: number | undefined;
  readonly railCode: string | undefined;

  constructor(init: AiErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = "AiError";
    this.code = init.code;
    this.userMessage = init.userMessage;
    this.status = init.status;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.railCode = init.railCode;
  }

  /** True when trying again later can succeed without any change by the visitor or the app owner. */
  get retryable(): boolean {
    return this.code === "rate_limited" || this.code === "network" || this.code === "upstream";
  }
}

function notConfigured(): AiError {
  return new AiError({
    code: "not_configured",
    message: "AI is not configured: set VITE_AI_URL and VITE_AI_APP_KEY (the platform does this for previews and published apps).",
    userMessage: "AI features are not available on this app yet.",
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

/** The rail answers with JSON like { error: { code, message } } or { code, message } or { detail: { code } }. Be liberal. */
function readRailError(body: unknown): { code?: string; message?: string; retryAfter?: number } {
  const root = asRecord(body);
  if (!root) return {};
  const nested = asRecord(root.error) ?? asRecord(root.detail);
  const pick = (key: string): unknown => nested?.[key] ?? root[key];
  const code = [pick("code"), pick("type"), typeof root.error === "string" ? root.error : undefined].find(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const message = [pick("message"), typeof root.detail === "string" ? root.detail : undefined].find(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const retry = pick("retry_after_seconds") ?? pick("retry_after") ?? pick("retryAfterSeconds");
  return {
    ...(code ? { code } : {}),
    ...(message ? { message } : {}),
    ...(typeof retry === "number" ? { retryAfter: retry } : {}),
  };
}

/** Turn anything thrown by the Fal client (or by us) into an AiError with a visitor-readable message. */
export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;

  const err = asRecord(error);
  const name = typeof err?.name === "string" ? err.name : "";
  if (name === "AbortError" || name === "TimeoutError") {
    return new AiError({ code: "aborted", message: "The request was cancelled.", userMessage: "Cancelled.", cause: error });
  }

  const status = typeof err?.status === "number" ? err.status : undefined;
  if (status !== undefined) {
    const rail = readRailError(err?.body);
    const railCode = rail.code?.toLowerCase();
    const requestId = typeof err?.requestId === "string" && err.requestId ? err.requestId : undefined;
    const base = {
      status,
      cause: error,
      ...(requestId ? { requestId } : {}),
      ...(railCode ? { railCode } : {}),
      ...(rail.retryAfter !== undefined ? { retryAfterSeconds: rail.retryAfter } : {}),
    };
    const detail = rail.message ?? (error instanceof Error ? error.message : `HTTP ${status}`);

    if (railCode === "insufficient_credits" || status === 402) {
      return new AiError({
        ...base,
        code: "insufficient_credits",
        message: detail,
        userMessage: "This app has run out of AI credits. Please try again later.",
      });
    }
    if (railCode === "endpoint_not_allowed" || status === 403) {
      return new AiError({
        ...base,
        code: "endpoint_not_allowed",
        message: detail,
        userMessage: "This AI feature is not enabled for this app.",
      });
    }
    if (railCode?.endsWith("_daily_cap") || (status === 429 && railCode?.includes("daily_cap"))) {
      const perVisitor = railCode.startsWith("end_user");
      return new AiError({
        ...base,
        code: "daily_cap",
        message: detail,
        userMessage: perVisitor
          ? "You have reached today's limit for this feature. Please come back tomorrow."
          : "This app has reached its daily AI limit. Please try again tomorrow.",
      });
    }
    if (railCode === "rate_limited" || status === 429) {
      return new AiError({
        ...base,
        code: "rate_limited",
        message: detail,
        userMessage: "Too many requests right now. Please wait a moment and try again.",
      });
    }
    if (status === 401) {
      return new AiError({
        ...base,
        code: "unauthorized",
        message: detail,
        userMessage: "This app's AI connection is not set up correctly.",
      });
    }
    if (status === 422 || status === 400) {
      return new AiError({
        ...base,
        code: "invalid_input",
        message: detail,
        userMessage: "That request could not be processed. Try changing your input.",
      });
    }
    if (status >= 500) {
      return new AiError({
        ...base,
        code: "upstream",
        message: detail,
        userMessage: "The AI service had a problem. Please try again.",
      });
    }
    return new AiError({ ...base, code: "unknown", message: detail, userMessage: "Something went wrong. Please try again." });
  }

  if (error instanceof TypeError) {
    return new AiError({
      code: "network",
      message: error.message,
      userMessage: "Could not reach the AI service. Check your connection and try again.",
      cause: error,
    });
  }

  return new AiError({
    code: "unknown",
    message: error instanceof Error ? error.message : String(error),
    userMessage: "Something went wrong. Please try again.",
    cause: error,
  });
}

// ---------------------------------------------------------------- configuration and client

interface RailConfig {
  url: string;
  key: string;
}

function readConfig(): RailConfig | null {
  const url = import.meta.env.VITE_AI_URL?.trim();
  const key = import.meta.env.VITE_AI_APP_KEY?.trim();
  return url && key ? { url, key } : null;
}

/** False when the env vars are absent. Use it to hide AI-only UI instead of showing a broken button. */
export function isAiConfigured(): boolean {
  return readConfig() !== null;
}

let defaultEndUser: string | undefined;

/**
 * Identify the current visitor to the rail (forwarded as the x-end-user header) so the app owner's
 * per-end-user caps apply. Use a stable, non-sensitive id: your own account id or an anonymous id. Never an email.
 */
export function setAiEndUser(id: string | null | undefined): void {
  defaultEndUser = id ? id : undefined;
}

export const END_USER_HEADER = "x-end-user";

type FalClientConfig = NonNullable<Parameters<typeof import("@fal-ai/client").createFalClient>[0]>;

/** The one place the rail wiring is defined: Fal's proxy mode, the app key, the end-user header, sane retries. */
function railClientConfig(config: RailConfig, endUser: () => string | undefined): FalClientConfig {
  return {
    proxyUrl: { url: config.url, when: "always" },
    credentials: config.key,
    // Intentional: see "ABOUT VITE_AI_APP_KEY" above.
    suppressLocalCredentialsWarning: true,
    requestMiddleware: async (request) => {
      const user = endUser();
      return user ? { ...request, headers: { ...(request.headers ?? {}), [END_USER_HEADER]: user } } : request;
    },
    // The rail's own 429s (rate_limited, *_daily_cap) are answers, not blips: do not retry them behind the user's back.
    retry: { maxRetries: 2, retryableStatusCodes: [502, 503, 504] },
  };
}

const clients = new Map<string, Promise<FalClient>>();

/** The stock Fal client wired to the rail. Throws AiError("not_configured") when env is absent. */
export async function getFalClient(endUserId?: string): Promise<FalClient> {
  const config = readConfig();
  if (!config) throw notConfigured();
  const user = endUserId ?? defaultEndUser ?? "";
  const cacheKey = `${config.url}\n${config.key}\n${user}`;
  let pending = clients.get(cacheKey);
  if (!pending) {
    pending = import("@fal-ai/client").then(({ createFalClient }) => createFalClient(railClientConfig(config, () => user || undefined)));
    clients.set(cacheKey, pending);
    pending.catch(() => clients.delete(cacheKey));
  }
  return pending;
}

/**
 * For code written against the stock API (`import { fal } from "@fal-ai/client"`): configures the global singleton
 * exactly like getFalClient() does (end user taken from setAiEndUser at request time) and returns it.
 * Without this call the singleton would talk to fal.run directly, which fails here by design.
 */
export async function configureFalSingleton() {
  const config = readConfig();
  if (!config) throw notConfigured();
  const { fal } = await import("@fal-ai/client");
  fal.config(railClientConfig(config, () => defaultEndUser));
  return fal;
}

// ---------------------------------------------------------------- helpers

export interface CallOptions {
  signal?: AbortSignal;
  /** Overrides setAiEndUser() for this call. */
  endUserId?: string;
}

export interface AiProgress {
  phase: "queued" | "running" | "completed";
  /** Position in the queue while phase is "queued" (0 = next). */
  queuePosition?: number;
  /** Latest model log lines, oldest first. */
  logs: string[];
  requestId?: string;
}

export interface SubscribeOptions extends CallOptions {
  onProgress?: (progress: AiProgress) => void;
  /** Poll interval in ms (default 700). */
  pollInterval?: number;
  /** Give up and cancel after this many ms. */
  timeoutMs?: number;
}

export interface AiResult<TOutput> {
  data: TOutput;
  requestId: string;
}

function progressFrom(status: QueueStatus, requestId: string | undefined): AiProgress {
  const logs = "logs" in status ? status.logs.map((entry) => entry.message) : [];
  const base = { logs, ...(requestId ? { requestId } : {}) };
  if (status.status === "IN_QUEUE") return { ...base, phase: "queued", queuePosition: status.queue_position };
  if (status.status === "IN_PROGRESS") return { ...base, phase: "running" };
  return { ...base, phase: "completed" };
}

/** Blocking call (Fal "run"). Fine for fast models; prefer subscribe() for anything that can take more than a few seconds. */
export async function runModel<TOutput = unknown, TInput extends object = Record<string, unknown>>(
  endpointId: string,
  input: TInput,
  options: CallOptions = {},
): Promise<AiResult<TOutput>> {
  try {
    const client = await getFalClient(options.endUserId);
    const result = await client.run(endpointId, {
      input: input as Record<string, unknown>,
      ...(options.signal ? { abortSignal: options.signal } : {}),
    });
    return { data: result.data as TOutput, requestId: result.requestId };
  } catch (error) {
    throw toAiError(error);
  }
}

/** Queue call with progress callbacks. Cancels the request on the rail (which refunds) if the signal aborts. */
export async function subscribe<TOutput = unknown, TInput extends object = Record<string, unknown>>(
  endpointId: string,
  input: TInput,
  options: SubscribeOptions = {},
): Promise<AiResult<TOutput>> {
  let requestId: string | undefined;
  let client: FalClient | undefined;
  try {
    client = await getFalClient(options.endUserId);
    const result = await client.subscribe(endpointId, {
      input: input as Record<string, unknown>,
      logs: true,
      pollInterval: options.pollInterval ?? 700,
      ...(options.timeoutMs ? { timeout: options.timeoutMs } : {}),
      ...(options.signal ? { abortSignal: options.signal } : {}),
      onEnqueue: (id) => {
        requestId = id;
        options.onProgress?.({ phase: "queued", logs: [], requestId: id });
      },
      onQueueUpdate: (status) => options.onProgress?.(progressFrom(status, requestId)),
    });
    return { data: result.data as TOutput, requestId: result.requestId };
  } catch (error) {
    const mapped = toAiError(error);
    if (mapped.code === "aborted" && requestId && client) {
      // Best effort: let the rail stop the job so unused credits are released.
      void client.queue.cancel(endpointId, { requestId }).catch(() => undefined);
    }
    throw mapped;
  }
}

export interface GeneratedImage {
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
}

export interface ImageInput {
  prompt: string;
  /** Endpoint specific extras: image_size, num_images, seed, negative_prompt ... */
  [key: string]: unknown;
}

export interface GenerateImageResult {
  images: GeneratedImage[];
  seed?: number;
  requestId: string;
}

function normaliseImages(output: unknown): GeneratedImage[] {
  const root = asRecord(output);
  const raw = Array.isArray(root?.images) ? root.images : root?.image ? [root.image] : [];
  const images: GeneratedImage[] = [];
  for (const item of raw) {
    const entry = asRecord(item);
    if (!entry || typeof entry.url !== "string") continue;
    images.push({
      url: entry.url,
      ...(typeof entry.width === "number" ? { width: entry.width } : {}),
      ...(typeof entry.height === "number" ? { height: entry.height } : {}),
      ...(typeof entry.content_type === "string" ? { contentType: entry.content_type } : {}),
    });
  }
  return images;
}

/**
 * Text-to-image (or image-to-image) through the rail. `endpointId` must be one the app's capability
 * manifest allows, for example "fal-ai/flux/schnell"; anything else fails with "endpoint_not_allowed".
 * Always give generated images alt text when you render them (components/core/Img).
 */
export async function generateImage(
  endpointId: string,
  input: ImageInput,
  options: SubscribeOptions = {},
): Promise<GenerateImageResult> {
  const { data, requestId } = await subscribe<unknown, ImageInput>(endpointId, input, options);
  const images = normaliseImages(data);
  if (images.length === 0) {
    throw new AiError({
      code: "upstream",
      message: `Endpoint ${endpointId} returned no images.`,
      userMessage: "The AI service did not return an image. Please try again.",
      requestId,
    });
  }
  const seed = asRecord(data)?.seed;
  return { images, requestId, ...(typeof seed === "number" ? { seed } : {}) };
}
