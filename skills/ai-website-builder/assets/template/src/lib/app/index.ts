/**
 * The app kit's library: a demo store, demo auth with seeded accounts, hooks and pure helpers. Client-only behind server snapshots, so
 * prerender and hydration stay identical. Import from here: `import { createDemoApp, useCollection, useAuth } from "@/lib/app"`.
 */
export { browserStorage, memoryStorage, type ChannelFactory, type ChannelLike, type StorageLike } from "./storage";
export {
  SEED_EPOCH,
  createId,
  createStore,
  type Row,
  type Schema,
  type SchemaOf,
  type Seed,
  type SeedContext,
  type Store,
  type StoreOptions,
  type StoreState,
} from "./store";
export {
  createAuth,
  publicUser,
  roleAllows,
  safeNextPath,
  type Account,
  type Auth,
  type AuthOptions,
  type AuthState,
  type PublicUser,
  type Role,
  type SignInResult,
} from "./auth";
export { applyPreviewParam, createDemoApp, getDemoApp, type DemoApp, type DemoAppOptions, type PreviewEnv } from "./demo";
export { isApplePlatform, isEditableTarget, matchesCombo, parseCombo, type Combo } from "./hotkey";
export {
  useAuth,
  useCollection,
  useHotkey,
  useMounted,
  useNow,
  useQueryParam,
  useStore,
  type HotkeyOptions,
  type UseAuth,
} from "./hooks";
export { dayKey, dayLabel, fuzzyFilter, fuzzyScore, initials, relativeTime, timeLabel } from "./format";
export { retry, sendOptimistic, type OutboxOptions, type SendStatus } from "./outbox";
