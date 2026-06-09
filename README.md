# pi-file-browser

A TUI file browser extension for [pi](https://github.com/earendil-works/pi). Navigate directories, open files for editing, and switch workspace sessions — all from within pi.

![demo](https://github.com/user-attachments/assets/9a1d1c2f-2774-4e97-b38d-c8d9d2135b0d)

## Install

```
pi install npm:@almegal/pi-file-browser
```

Or from this repo:

```sh
pi install git:github.com/almegal/pi-file-browser
```

After install, run `/reload` in pi.

## Features

### 🗂 File browsing

Navigate the filesystem from within pi with vim-style keys.

| Key | Action |
|-----|--------|
| `↑` `↓` / `j` `k` | Move selection |
| `←` / `h` / `Backspace` | Go to parent directory |
| `→` / `l` | Enter selected directory |
| `Enter` on directory | Select directory for workspace switch |
| `Enter` on file | Open file in pi editor |
| `Esc` / `q` | Close browser |

### 🔍 Type-to-filter search

Start typing to instantly filter the file list. Press `/` to enter search mode explicitly.

- Prefix matches appear before substring matches
- Directories always float to the top
- In search mode, `j`/`k`/`h`/`l` are treated as search characters, not navigation — use arrow keys to move selection

| Key | Action |
|-----|--------|
| Printable char | Append to search query |
| `↑` `↓` | Move selection within results |
| `→` | Navigate into selected directory |
| `Enter` | Confirm selection and act on entry |
| `Esc` / `←` | Cancel search, restore previous position |
| `Backspace` | Delete last char, or exit search if query is empty |

### . Toggle hidden files

Press `.` to show or hide dotfiles and dot-directories (`.env`, `.git`, `.pi`, etc.).
When hidden files are visible, the status bar shows a `[hidden]` marker. The hints bar shows `.=hidden` when files are hidden and `A=hidden` when they are visible.

### 🎨 Smart file-type icons

Files and directories get context-aware emoji icons instead of generic 📄/📂:

| Type | Icon | Examples |
|------|------|----------|
| TypeScript | 🟦 | `.ts`, `.tsx` |
| JavaScript | 🟢 | `.js`, `.jsx`, `.vue`, `.svelte` |
| Python | 🐍 | `.py` |
| Ruby | 💎 | `.rb` |
| Go | 🦋 | `.go` |
| Rust | 🧩 | `.rs` |
| Java | ☕ | `.java` |
| Kotlin | 💜 | `.kt` |
| Swift | 🦁 | `.swift` |
| C / C++ | ⚙️ | `.c`, `.cpp`, `.h` |
| C# | 💡 | `.cs` |
| PHP | 🐘 | `.php` |
| Web / Markup | 🌐 | `.html`, `.htm` |
| Styles | 🎨 | `.css`, `.scss`, `.less` |
| Config/Data | 📦 | `.json`, `.yaml`, `.toml`, `.xml` |
| Data | 📊 | `.csv` |
| Database | 🗃 | `.sql` |
| Documentation | 📝 | `.md`, `.mdx`, `.rst`, `.adoc` |
| Plain text | 📄 | `.txt` |
| Shell | 💻 | `.sh`, `.bash`, `.zsh`, `.fish` |
| Lock files | 🔒 | `.lock` |
| Source maps | 🗺 | `.map` |
| Images | 🖼 | `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico` |
| Audio | 🎵 | `.mp3`, `.wav`, `.flac` |
| Video | 🎬 | `.mp4`, `.mkv`, `.avi`, `.mov` |
| Archives | 🗜 | `.zip`, `.tar`, `.gz`, `.bz2`, `.7z`, `.rar` |
| Fonts | 🔡 | `.ttf`, `.otf`, `.woff`, `.woff2` |
| Binaries | ⚡ | `.exe`, `.dll`, `.so`, `.bin`, `.wasm` |
| Special files | 🔨 | `Makefile`, `Dockerfile`, `Vagrantfile` |
| Environment | 🔑 | `.env`, `.env.*` |
| Ignore files | 🚫 | `.gitignore`, `.dockerignore` |
| Package config | 📦 | `package.json`, `tsconfig.json` |
| License | 📜 | `LICENSE`, `LICENSE*` |
| Readme | 📖 | `README.md`, `README*` |
| Git | 🔀 | `.git/`, `.github/` |
| Pi config | 🔮 | `.pi/` directory |
| Agents config | 🤖 | `.agents/` directory |
| IDE | 💻 | `.vscode/`, `.idea/` |
| Tests | ✅ | `test/`, `tests/`, `__tests__/` |
| Source | 📂 | `src/` |
| Dist | 📤 | `dist/` |
| Build | 🔨 | `build/` |
| Docs | 📚 | `docs/`, `lib/` |
| Public | 🌐 | `public/` |
| Assets | 🎨 | `assets/` |
| Config | ⚙️ | `config/` |
| Scripts | 💻 | `scripts/` |
| Vendor | 💰 | `vendor/` |
| Bin | ⚡ | `bin/` |
| node_modules | 📦 | `node_modules/` |

60+ extension mappings + special filename and directory detection.

### 🎨 Pi theme integration

The browser respects the active pi theme — no hardcoded colors:

| Element | Theme token |
|---------|------------|
| Directory names | `accent` |
| Selected item | `selectedBg` |
| Hints & dim text | `dim` |
| Status bar | `accent` |
| Border frame | `border` / `borderAccent` |
| Loading message | `muted` |

Switch pi themes and the browser adapts automatically.

### 🔄 Directory selection & session switching

Pressing `Enter` on a directory shows a menu:

- 🆕 **New session** — create a new pi session with that directory as cwd
- 🔄 **Resume session** — switch to an existing session (shows date, name, message count, and first message preview)
- ↩ **Back** — return to the browser

Config discovery: the browser detects `AGENTS.md`, `CLAUDE.md`, `.pi/`, `.agents/` in the target directory and shows what's available.

| Key | Action |
|-----|--------|
| `↑` `↓` | Select option |
| `Enter` | Confirm selected option |
| `Esc` / `←` | Return to browser |

### ✏️ File editing

Pressing `Enter` on a file closes the browser and opens pi's built-in editor with the file contents. On save, changes are written back. On cancel, the browser reopens at the same directory.

### 🧭 Navigation history

When navigating into a directory with `→`/`l` and then going back with `←`/`h`/`Backspace`, the selection is automatically restored to the directory you came from — no need to scroll back to find your place.

### 📏 Status bar details

The status bar shows the selected entry's type (`DIR` or `FILE`), name, and file size (e.g., `1.2KB`). When hidden files are visible, a `[hidden]` marker appears.

### 📜 Scroll behavior

The entry list scrolls to keep the selected item centered in view, so you never lose context when moving through long directories.

---

## Usage

Run `/files` in pi to open the browser.

## Build

```sh
npm run build
```

## Architecture

```
src/
├── index.ts                  # Entry point (Composition Root)
├── app/FileBrowserApp.ts     # Command registration, session logic
├── components/FileBrowserComponent.ts  # TUI rendering & input
├── handlers/NavigationInputHandler.ts   # Key → action mapping
├── interfaces/               # IFileSystemProvider, IInputHandler, IPanelModel
├── models/PanelModel.ts      # Panel state (navigation, selection, search, hidden toggle)
├── providers/FileSystemProvider.ts      # Node.js fs implementation
├── services/
│   ├── ConfigDiscovery.ts    # Detects AGENTS.md, .pi/, etc.
│   └── FileTypeIconProvider.ts  # Extension/directory → emoji icon mapping
└── types.ts                  # Domain types
```