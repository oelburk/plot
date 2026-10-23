# Plot: design spec

Date: 2026-10-21
Status: implemented.

## What we're building

Plot is a small local project tracker for one person on one computer. It ships as a macOS desktop app (Tauri 2). The source of truth for every screen, value, and behaviour is the design handoff in `docs/design-handoff.md`. This spec records only the decisions made on top of the handoff. If something isn't covered here, follow the handoff exactly.

The guiding rule from the handoff still applies: **not another Jira**. If a feature isn't in the handoff or in this spec, leave it out.

## Decisions

| Topic | Decision |
|---|---|
| Desktop shell | Tauri 2. The Rust toolchain is installed via rustup. |
| App stack | Vite, React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), Zustand with `persist`, Vitest, lucide-react, and Fontsource Geist and Geist Mono (bundled, so it works offline) |
| Routing | None. The screen (`home`, `project`, `settings`) is store state, as in the prototype. |
| Repo | GitHub repo `oelburk/plot`, on the `main` branch. MIT licensed. |
| In scope from "Not designed yet" | Renaming and deleting projects and epics, an undo toast after deletes, and confirmation for Reset and Import |
| Added 2026-10-22 | Reordering epics and tasks (including moving tasks between epics), renaming tasks, and task comments |
| Out of scope | Reassigning tasks when removing a discipline, the narrow-width sidebar drawer, component tests |

## Architecture

```
plot/
  docs/                      design handoff and this spec
  index.html
  package.json, vite.config.ts, tsconfig*.json
  src/
    main.tsx                 React root, imports fonts and index.css
    index.css                Tailwind import, @theme tokens, base styles
    App.tsx                  shell: sidebar, current screen, overlays, global keys
    store.ts                 Zustand store: data, prefs, UI state, actions
    sample-data.json         seed (copied from the handoff)
    lib/                     pure logic, unit-tested
    components/              shared UI pieces
    screens/                 Home, Project (Tree and Map), Settings, NewProject, Palette
  src-tauri/                 Tauri 2 shell
```

### Styling

- Tailwind v4. Tokens from the handoff are defined in `@theme` in `src/index.css`.
- `--color-*: initial` clears Tailwind's default palette, so only spec colors exist.
- `--spacing: 1px`, so spacing utilities are literal pixels: `px-18 py-13` means 18px and 13px. (`p-4` is therefore 4px, not 16px.)
- Discipline colors depend on the user's chosen hue. They're applied as inline styles from a helper: `oklch(0.78 0.1 H)`, with a `/0.14` tint. Neutral is `oklch(0.80 0.015 260)`, with a `/0.12` tint.
- Fonts: Geist (400/500/600) for the UI and Geist Mono (400/500) for numbers, indices, tags, and key hints. Base text is 13px with a line-height of 1.45.

### Data model

This matches the handoff's export format, so `src/sample-data.json` and exports from the handoff prototype import unchanged.

```ts
type Status = 0 | 1 | 2; // TODO = 0, DOING = 1, DONE = 2 (named constants)
interface Discipline { code: string; tag: string; name: string; hue: number | null }
interface Task { id: string; title: string; d: string; s: Status; notes: string }
interface Epic { id: string; name: string; open: boolean; tasks: Task[] }
interface Project { id: string; name: string; desc: string; edited?: string; updatedAt?: string; epics: Epic[] }
```

- Status stays numeric, not the string enums the handoff recommends. This keeps import and export identical to the handoff format with no conversion code.
- `updatedAt` is an ISO timestamp, set on every data change and shown in relative form ("just now", "2h ago", "yesterday", "3 days ago", or "Sep 28" when older than a week). When `updatedAt` is missing, the legacy `edited` string is shown instead.
- `epic.open` stays in the data, so expand state survives a restart. Toggling it, and Collapse all or Expand all, **never** bumps `updatedAt`.

### Progress rules (from the handoff)

- `pct = round(done / total × 100)`, and 0 when there are no tasks. In progress counts as 0.
- The same formula applies to the project, each epic, each discipline across the project, and each discipline within an epic.
- The displayed pct is capped at 99 while any task is unfinished, so 199 of 200 reads 99%, never 100%. 100 means every task is done, and it renders in done-green text (only when the item has at least one task).

### Store (`src/store.ts`)

One Zustand store with three parts:

- **Data** (saved): `projects`, `disciplines`.
- **Prefs** (saved): `view: 'tree'|'map'`, `detail: 'bar'|'squares'|'grouped'`, `toggleStyle: 'labels'|'glyphs'`, `showDisc: boolean`, `hideDone: boolean`. The toolbar and Settings write the same values, so the last choice is the default.
- **UI state** (in memory only): `screen`, `pid`, `filter`, `focus` (the epic in the map panel), `openTask`, `adding` (the epic id whose add-task input is open), `addingEpic`, `overlay: 'none'|'new'|'palette'`, `undo` (toast).

Text being typed (task and epic drafts, the selected draft discipline, the palette query and selection, the new-project form, the discipline draft) lives in component state.

All data writes go through `edit(state, fn, touch)`, which runs `structuredClone` on the data, applies `fn` to the copy, and sets `updatedAt` on the touched project; `mutate` and `inProject` apply it with `set` (the latter on the current project), and `withUndo` does the same while keeping the pre-change snapshot for the Undo toast. The data is about 17 KB, so copying on every change is cheap. Immer is the upgrade path if the data ever grows large.

Persistence: Zustand `persist` with the localStorage key `plot.v1`. It saves the data and prefs only. Inside Tauri, localStorage lives in the app's webview data folder, tied to the app ID `com.oelburk.plot`, and survives restarts. The app seeds from `src/sample-data.json` only when there's no saved state at all. If you delete every project, you get an empty Home, not the sample data back. A task whose discipline code is unknown, for example after an import without disciplines, shows the first three letters of the code, uppercased, as its tag, in the neutral color.

## Behaviour added on top of the handoff

### Rename

- Double-clicking any of these turns it into an inline input: the project H1, an epic name in the tree, the epic name in the map's side panel header (or its Edit button), or a sidebar project row. Map tiles don't rename; a single click opens the panel.
- Enter saves. Esc or clicking away cancels. Empty names are rejected, and the old name is kept.
- The ⋯ menu's Rename action starts the same inline edit.

- Task titles rename the same way: double-click the title in the tree or the map panel, or use Rename in the task's ⋯ menu or in its expanded panel.

### Reorder

- Epics drag by their tree row or their map tile; tasks drag by their row (map panel tasks only while collapsed). A 2px selection-colour line shows where the item lands; it uses the top or bottom half of the hovered item in the tree and panel, and the left or right half of a tile in the map.
- Dropping a task on another task inserts it there, in any epic. Dropping it anywhere else on an epic (its header, its tile, the empty space below its tasks) appends it to that epic, which is outlined while hovered and opens on drop.
- For the keyboard, the epic and task ⋯ menus have Move up and Move down. They step past the neighbouring *visible* item, so a filter, Hide done or Grouped mode never swallows a move.
- Tauri's native file drop is off (`dragDropEnabled: false`) so it can't intercept in-page drags; import uses a file picker.

### Comments

- Expanded tasks show a Comments section between Notes and the owner row. Notes stays as the task description.
- `Task.comments?: { id, text, at, edited? }[]`, oldest first; `at` and `edited` are ISO timestamps, shown relative with the full date and time on hover.
- Enter posts, Shift+Enter adds a line. Edit opens the comment in place: Enter saves (marking it edited), Esc or clicking away cancels. Delete shows the undo toast.
- The notes icon on a row shows when a task has notes or comments. Import accepts `comments` when present (each needs `text` and `at`); CSV export leaves them out.

### ⋯ menu

- It appears on epic rows (visible on hover and keyboard focus, placed in the free space before the progress bar or squares) and next to the project title (also visible on hover and keyboard focus, and while its popover is open, so the header matches the handoff at rest).
- Task rows (tree and map panel) have one too, before the status toggle, shown the same way.
- Items: Rename, Move up and Move down (epics and tasks, when there's somewhere to move), and Delete. Delete uses the danger text color on hover and keyboard focus.
- It's styled like the palette: `#15161a`, a 1px `rgba(255,255,255,.09)` border, radius 10, the overlay shadow, and items padded 7/10 with radius 6 at 12.5px.
- It closes on outside click, Esc, or choosing an item.

### Delete and undo

- Deleting a task, epic, or project saves a copy of the data from just before the delete, then deletes.
- A toast appears at the bottom center, for example `Deleted "Billing"` with an **Undo** button. It uses the `#15161a` surface, radius 10, and the overlay shadow. It auto-hides after 6 seconds. Hovering the toast pauses the timer, as does keyboard focus on Undo (a mouse delete also moves focus to Undo, but that doesn't pause it). Leaving restarts the full 6 seconds.
- Undo restores the saved copy. **Known limit:** edits made between the delete and Undo are rolled back too. This is accepted, and marked in the code with a `ponytail:` comment.
- Deleting the current project goes to Home. A new delete replaces the previous toast.

### Reset and Import confirmation (inline)

- **Reset:** clicking Reset turns that row's control into "Reset everything?" with Cancel and Reset (danger style). Confirming restores the sample data, both projects and disciplines, and goes to Home.
- **Import:** choosing a file parses it first.
  - If it's valid, the Import row shows `Replace all data with {filename} ({n} projects, {m} tasks)?` with Cancel and Replace.
  - If it's invalid, the row shows a short error saying what's wrong, for example "That file isn't a Plot export. Expected a projects list." The data isn't touched.
- Import accepts `{ app:'plot', projects, disciplines? }` or a bare projects array. It replaces all data, including disciplines when present.
- A file is valid when:
  - `projects` is a non-empty array;
  - every project has a non-empty `name` and an `epics` array;
  - every epic has a non-empty `name` and a `tasks` array;
  - every task has a non-empty `title` and `s` set to 0, 1 or 2;
  - project, epic and task ids are unique across the file;
  - `disciplines`, when present, is a list of entries with a non-empty `code`, `tag` and `name` and a numeric or null `hue`, with no repeated code and no repeated tag (case-insensitive).

  Missing `id`s are generated, missing `notes`/`desc` become `''`, a missing `d` becomes `OT`, and a missing `open` becomes `false`. Anything else is rejected with a message that names the first problem found.

### Filters and dimmed squares

- Clicking a task square that is dimmed by Hide done or the discipline filter opens it and turns off Hide done or clears the filter, so the task is visible. The tree and the map do the same.

### Disciplines (Settings)

- The name and tag inputs keep a local draft and commit on blur or Enter; Esc discards the draft.
- An empty name reverts to the previous name. An empty tag, or one another discipline already uses (case-insensitive), reverts to the previous tag. The store enforces the same rules.

### Export

- JSON: `{ app:'plot', version:1, exported:ISO, disciplines, projects }`. File name: `plot-export.json`.
- CSV: columns `project, epic, task, discipline, status, notes`, using the discipline name and the status label. Every value is quoted, with inner quotes doubled.
- In Tauri, export opens a native Save dialog (`@tauri-apps/plugin-dialog`) and writes the file with a small Rust command (`std::fs::write`). In a browser, export falls back to an `<a download>` Blob.

## Desktop shell

- Tauri 2, product name "Plot", app ID `com.oelburk.plot`.
- The window opens at 1280×860, with a minimum of 1040×640. That minimum is why no sidebar drawer is needed.
- macOS title bar: `titleBarStyle: "Overlay"` with a hidden title. The sidebar runs to the top of the window, with the traffic-light buttons sitting over it.
  - The sidebar's top padding grows by 28px only when running in Tauri.
  - The sidebar top strip and the main area's top bar carry `data-tauri-drag-region`, so the window drags from there.
- The app icon is the logo mark: a rounded square with a light border, filled `#ececee` across the bottom 55%, on the `#0e0f12` app color. It's drawn as an SVG and turned into every icon size with `tauri icon`.

## Quality floor

- A visible `:focus-visible` ring on every interactive element: 2px, using the selection color `oklch(0.78 0.1 250 / .6)`. Text fields have no outline, so they draw the same ring as a 2px box-shadow on focus.
- Focus returns to where the user was: closing a modal restores its opener unless the closing action already moved focus (a new project focuses its add input), and when the opener is gone, focus goes to the screen's main heading. So do Undo and Reset.
- Under `prefers-reduced-motion: reduce`, all transitions are off.
- Status toggle segments have a `title` and an `aria-label`. Icon-only buttons have an `aria-label`.
- Esc and ⌘K/Ctrl+K behave as the handoff describes. Esc closes the ⋯ menu first.

## Testing and verification

- **Vitest unit tests** for:
  - `lib/`: progress, quick-add parsing, tag generation, next hue, relative time, CSV and JSON export, and import validation.
  - Store actions: adding a task opens its epic; data changes bump `updatedAt` but toggling an epic doesn't; discipline removal only works when the discipline is unused and more than one exists; new disciplines go in before "Other"; delete followed by undo restores the data.
- **Visual checks:** serve the app and use a Playwright script driving the installed Chrome (`channel: 'chrome'`, run via `npx`, not added to the project) to screenshot it at 1280×860. States: tree in each mode, tree dense, map with the panel open, home, new project step 2, palette with a quick-add query, and settings. (The original build was compared against the handoff prototype this way.)
- **Desktop check:** `npm run tauri build` produces `Plot.app`. Open it and confirm that data persists across restarts, export saves through the Save dialog, and import works.
