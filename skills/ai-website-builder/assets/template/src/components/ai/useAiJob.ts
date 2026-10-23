import { useCallback, useEffect, useRef, useState } from "react";
import { AiError, subscribe, toAiError, type AiProgress } from "@/lib/ai";

export type AiJobStatus = "idle" | "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface AiJobState<TOutput> {
  status: AiJobStatus;
  progress: AiProgress | null;
  result: TOutput | null;
  error: AiError | null;
  requestId: string | null;
}

export interface UseAiJobOptions<TOutput> {
  /** Forwarded as x-end-user for per-visitor caps. */
  endUserId?: string;
  onSuccess?: (result: TOutput) => void;
  onError?: (error: AiError) => void;
}

const IDLE = { status: "idle", progress: null, result: null, error: null, requestId: null } as const;

/**
 * One AI job at a time against one endpoint: run(input), watch status/progress, cancel(), reset().
 * Starting a new run cancels the previous one; unmounting cancels the running one. Pair with <GenerationProgress>.
 *
 *   const job = useAiJob<{ prompt: string }, { images: { url: string }[] }>("fal-ai/flux/schnell");
 *   <button onClick={() => job.run({ prompt })} disabled={job.isBusy}>Generate</button>
 *   <GenerationProgress {...job} onRetry={() => job.run({ prompt })} />
 */
export function useAiJob<TInput extends object = Record<string, unknown>, TOutput = unknown>(
  endpointId: string,
  options: UseAiJobOptions<TOutput> = {},
) {
  const [state, setState] = useState<AiJobState<TOutput>>(IDLE);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const mine = ++generation.current;
      const current = () => mounted.current && generation.current === mine;

      setState({ ...IDLE, status: "queued" });
      try {
        const { data, requestId } = await subscribe<TOutput, TInput>(endpointId, input, {
          signal: abort.signal,
          ...(optionsRef.current.endUserId ? { endUserId: optionsRef.current.endUserId } : {}),
          onProgress: (progress) => {
            if (!current()) return;
            setState((prev) => ({
              ...prev,
              status: progress.phase === "queued" ? "queued" : "running",
              progress,
              requestId: progress.requestId ?? prev.requestId,
            }));
          },
        });
        if (current()) {
          setState({ status: "succeeded", progress: null, result: data, error: null, requestId });
          optionsRef.current.onSuccess?.(data);
        }
        return data;
      } catch (caught) {
        const error = toAiError(caught);
        if (current()) {
          if (error.code === "aborted") {
            setState({ ...IDLE, status: "cancelled" });
          } else {
            setState({ ...IDLE, status: "failed", error });
            optionsRef.current.onError?.(error);
          }
        }
        return null;
      }
    },
    [endpointId],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    generation.current++;
    setState(IDLE);
  }, []);

  return { ...state, isBusy: state.status === "queued" || state.status === "running", run, cancel, reset };
}
