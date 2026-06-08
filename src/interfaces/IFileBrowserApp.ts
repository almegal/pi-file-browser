// ============================================================
// IFileBrowserApp — top-level orchestrator
// ============================================================

export interface IFileBrowserApp {
  start(): Promise<void>;
  stop(): void;
}