# Repository Guidelines

## Project Structure & Module Organization

```
pi-file-browser/
├── src/
│   ├── index.ts              # Extension entry point (Composition Root)
│   ├── app/
│   │   └── FileBrowserApp.ts # Orchestrator — registers /files command
│   ├── components/
│   │   └── FileBrowserComponent.ts # TUI rendering + input handling
│   ├── handlers/
│   │   └── NavigationInputHandler.ts # Key → Direction/Action mapping
│   ├── interfaces/
│   │   ├── IFileSystemProvider.ts    # Filesystem abstraction
│   │   ├── IInputHandler.ts          # Input handler interface
│   │   └── IPanelModel.ts           # Panel state interface
│   ├── models/
│   │   └── PanelModel.ts       # Panel state (navigation, selection)
│   ├── providers/
│   │   └── FileSystemProvider.ts # Node.js fs implementation
│   └── types.ts                # Domain enums & interfaces
├── dist/                       # Compiled output (gitignored)
├── package.json
└── tsconfig.json
```

Architecture follows **Single Responsibility** per file and **Composition Root** for DI. Interfaces (`I*`) define contracts; models and providers implement them. The component never imports Node APIs directly — filesystem access goes through `IFileSystemProvider`.

## Build, Test, and Development Commands

- **`npm run build`** (`tsc`) — compile TypeScript to `dist/`. Always run after source changes.
- **`npm start`** (`node dist/index.js`) — entry point for standalone execution (not typical; normally loaded as a pi extension).

To test within pi, copy `dist/` and `src/` to `~/.pi/agent/extensions/pi-file-browser/` and run `/reload` in the TUI, then invoke `/files`.

There are no automated tests yet. When adding tests, place them in a `test/` directory mirroring `src/`.

## Coding Style & Naming Conventions

- **Language:** TypeScript, strict mode (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).
- **Indentation:** 2 spaces.
- **Naming:** `PascalCase` for classes/interfaces/types/enums, `camelCase` for functions/variables, `UPPER_SNAKE` for enum values. Interfaces prefixed with `I` (e.g., `IPanelModel`).
- **File naming:** `PascalCase.ts` — one class/interface per file, filename matches the export.
- **Exports:** Use named exports; the extension entry point uses `export default function`.
- **Comments:** Each file starts with a `// ===` header block stating responsibility.
- **ANSI rendering:** Always use `truncateToWidth()` and `visibleWidth()` from `@earendil-works/pi-tui` when constructing TUI output. Never assume fixed-width padding — always pad to computed `panelWidth`.

## Commit & Pull Request Guidelines

Use **conventional commit** format:

```
feat: short description
fix: short description
refactor: short description
```

Keep commits focused — one logical change per commit. PRs should include a description of the change and how it was verified (manual TUI test, etc.).