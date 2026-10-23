/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the platform AI rail. Empty or missing means AI features are inert. */
  readonly VITE_AI_URL?: string;
  /** Platform-minted, scope-limited app key (safe for the browser bundle, see src/lib/ai.ts). */
  readonly VITE_AI_APP_KEY?: string;
  /** The platform form relay for this app (`<platform>/f/<app id>`). Empty means forms cannot send (see src/lib/form.ts). */
  readonly VITE_FORMS_URL?: string;
  /** Ids of unconfirmed placeholders (<Draft>) the owner accepted, comma separated, or "*" for all. Set by the publish build only. */
  readonly VITE_ACCEPT_DRAFTS?: string;
  /** Public origin of the published app, no trailing slash. */
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
