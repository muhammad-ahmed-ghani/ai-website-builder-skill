import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dayKey, dayLabel, timeLabel, useMounted, useNow } from "@/lib/app";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { EmptyState } from "./EmptyState";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The message shape the list renders. Map your own rows to it (authorName is the fallback when `authors` has no entry). */
export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  /** Milliseconds since the epoch. */
  at: number;
  status?: "sending" | "sent" | "failed";
}

export interface MessageListProps {
  messages: Message[];
  /** The signed-in user: their own new messages always scroll into view. */
  currentUserId?: string;
  /** Display names by author id; wins over each message's authorName. */
  authors?: Record<string, { name: string }>;
  /** Shows a Retry button on failed messages. */
  onRetry?: (id: string) => void;
  /** Shown when there are no messages (default: a plain empty state). */
  empty?: ReactNode;
  /** Accessible name of the list (default "Messages"). */
  label?: string;
}

const GROUP_GAP_MS = 5 * 60_000;
const NEAR_BOTTOM_PX = 80;

interface Day {
  key: string;
  at: number;
  rows: Array<{ message: Message; head: boolean }>;
}

function groupByDay(messages: readonly Message[], utc: boolean): Day[] {
  const days: Day[] = [];
  let previous: Message | undefined;
  for (const message of messages) {
    const key = dayKey(message.at, utc);
    let day = days[days.length - 1];
    const sameDay = day?.key === key;
    if (!day || !sameDay) {
      day = { key, at: message.at, rows: [] };
      days.push(day);
    }
    const head = !sameDay || !previous || previous.authorId !== message.authorId || message.at - previous.at > GROUP_GAP_MS || previous.status === "failed";
    day.rows.push({ message, head });
    previous = message;
  }
  return days;
}

/**
 * A chat log. Groups messages by day (sticky day labels) and by author (a run within five minutes shows the avatar and name once),
 * shows messages that are still sending dimmed and failed ones with Retry, and keeps the reader's place: it follows new messages only
 * while the reader is near the bottom, otherwise it offers a "New messages" button. Message text is rendered as text, never as HTML.
 * Times use UTC until mount, so the prerender and hydration agree, then the visitor's time zone.
 */
export function MessageList({ messages, currentUserId, authors, onRetry, empty, label = "Messages" }: MessageListProps) {
  const utc = !useMounted();
  const now = useNow();
  const scroller = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const previous = useRef<{ first?: string; last?: string; count: number } | null>(null);
  const [unseen, setUnseen] = useState(0);
  const days = useMemo(() => groupByDay(messages, utc), [messages, utc]);

  const toBottom = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    following.current = true;
    setUnseen((n) => (n === 0 ? n : 0));
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    following.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (following.current) setUnseen((n) => (n === 0 ? n : 0));
  };

  useIsoLayoutEffect(() => {
    const first = messages[0]?.id;
    const lastMessage = messages[messages.length - 1];
    const before = previous.current;
    previous.current = { first, last: lastMessage?.id, count: messages.length };
    if (!before || before.first !== first) return toBottom(); // first render, or another conversation
    if (lastMessage && lastMessage.id !== before.last) {
      if (following.current || lastMessage.authorId === currentUserId) toBottom();
      else setUnseen((n) => n + Math.max(1, messages.length - before.count));
    }
  }, [messages, currentUserId]);

  const nameOf = (message: Message) => authors?.[message.authorId]?.name ?? message.authorName;

  return (
    <div data-message-list className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={label}
        tabIndex={0}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2"
      >
        {messages.length === 0 ? (empty ?? <EmptyState title="No messages yet" description="Messages sent here show up in this list." />) : null}
        {days.map((day) => (
          <div key={day.key} data-day={day.key}>
            <div data-day-separator className="sticky top-0 z-10 bg-bg py-2">
              <div className="relative flex items-center justify-center">
                <span aria-hidden="true" className="absolute inset-x-4 top-1/2 h-px bg-line" />
                <span className="relative rounded-full border border-line bg-bg px-3 py-0.5 text-xs font-medium text-muted">{dayLabel(day.at, now, utc)}</span>
              </div>
            </div>
            {day.rows.map(({ message, head }) => {
              const name = nameOf(message);
              const sending = message.status === "sending";
              return (
                <div
                  key={message.id}
                  data-message-id={message.id}
                  data-status={message.status}
                  data-own={message.authorId === currentUserId ? "true" : undefined}
                  className={cn("group grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 px-4 py-0.5 hover:bg-surface", head && "pt-3", sending && "opacity-60")}
                >
                  <div className="pt-0.5">
                    {head ? (
                      <Avatar name={name} size="md" />
                    ) : (
                      <span aria-hidden="true" className="hidden text-xs text-muted group-hover:inline">
                        {timeLabel(message.at, utc).replace(/ [AP]M$/, "")}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {head ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-fg">{name}</span>
                        <time dateTime={new Date(message.at).toISOString()} className="text-xs text-muted">
                          {timeLabel(message.at, utc)}
                        </time>
                      </div>
                    ) : null}
                    <p className="text-sm break-words whitespace-pre-wrap text-fg">{message.body}</p>
                    {sending ? <span className="sr-only">Sending</span> : null}
                    {message.status === "failed" ? (
                      <p className="mt-1 flex items-center gap-2 text-xs text-danger">
                        <span>Not sent.</span>
                        {onRetry ? (
                          <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => onRetry(message.id)}>
                            Retry
                          </Button>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {unseen > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button type="button" data-jump-latest variant="secondary" size="sm" className="pointer-events-auto shadow-md" onClick={toBottom}>
            <ArrowDown aria-hidden="true" />
            New messages
          </Button>
        </div>
      ) : null}
    </div>
  );
}
