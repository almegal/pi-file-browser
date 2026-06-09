# pi-file-browser

A TUI file browser extension for [pi](https://github.com/earendil-works/pi). Navigate directories, open files for editing, and switch workspace sessions — all from within pi.

![demo](https://github.com/user-attachments/assets/d85c538e-0594-4a70-9de0-666294e41d7b)

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
- `Enter` confirms selection, `Esc` cancels, `Backspace` deletes last char or exits search

### . Toggle hidden files

Press `.` to show or hide dotfiles and dot-directories (`.env`, `.git`, `.pi`, etc.).
When hidden files are visible, the status bar shows a `[hidden]` marker.

### 🎨 Smart file-type icons

Files and directories get context-aware emoji icons instead of generic 📄/📂:

| Type | Icon | Examples |
|------|------|----------|
| TypeScript | 🟦 | `.ts`, `.tsx` |
| JavaScript | 🟢 | `.js`, `.jsx` |
| Python | 🐍 | `.py` |
| Go | 🦋 | `.go` |
| Rust | 🧩 | `.rs` |
| Config/Data | 📦 | `.json`, `.yaml`, `.toml` |
| Documentation | 📝 | `.md`, `.rst` |
| Shell | 💻 | `.sh`, `.bash` |
| Images | 🖼 | `.png`, `.jpg`, `.svg` |
| Archives | 🗜 | `.zip`, `.tar`, `.gz` |
| Special files | 🔨 | `Makefile`, `Dockerfile` |
| Environment | 🔑 | `.env`, `.env.local` |
| Git | 🔀 | `.git/` directory |
| Pi config | 🔮 | `.pi/` directory |
| Tests | ✅ | `test/`, `tests/`, `__tests__/` |
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
- 🔄 **Resume session** — switch to an existing session (shows first message preview)
- ↩ **Back** — return to the browser

Config discovery: the browser detects `AGENTS.md`, `CLAUDE.md`, `.pi/`, `.agents/` in the target directory and shows what's available.

### ✏️ File editing

Pressing `Enter` on a file closes the browser and opens pi's built-in editor with the file contents. On save, changes are written back. On cancel, the browser reopens at the same directory.

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