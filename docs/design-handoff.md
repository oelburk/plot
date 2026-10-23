# Handoff: Plot, a light-weight local project tracker

## Overview
Plot is a deliberately small project tracker for one person on one computer. A **project** holds a few key **epics**. Each epic holds **tasks**. Every task has one **status** (Not started / In progress / Done) and one owning **discipline** (Frontend, Backend, UI/UX, Other, plus any the user adds). The app shows progress as a percentage for the project, for each epic and for each discipline.

The guiding principle is: **not another Jira**. There are no accounts, assignees, due dates, workflows, sprints or permissions. Changing a status is a single click on an inline 3-state toggle. If a feature isn't described here, leave it out.

"Plot" is a working name and can be replaced.

## About the design files
The original handoff included an HTML prototype (not kept in this repository) as a **design reference**. It showed the intended look and behaviour. It was not production code to copy. Rebuild these designs in the target codebase's environment, using its usual patterns and libraries. If no codebase exists yet, pick a suitable stack. A local-first web app works well, for example Vite + React + TypeScript with localStorage or IndexedDB. Wrap it in Tauri if a desktop app is wanted.

## Fidelity
**High fidelity.** Colors, type, spacing, radii and interactions are final. Recreate them closely. All values are listed below.

---

## Decisions so far (from review)
- **Primary view: the Tree.** The user liked the roomy tree (labelled status toggles) and the dense tree (glyph toggles, done tasks hidden). Ship both, as a user setting.
- **Per-discipline breakdown inside the tree.** Each epic row offers three modes:
  - `bar`: progress bar.
  - `squares`: one square per task, grouped by discipline.
  - `grouped`: an extra tree level, epic → discipline → task.

  The user switches mode from the tree toolbar. The default is set in Settings. The user hasn't picked a favourite yet, so build all three.
- **Map view** (epic tiles + epic side panel) is a second project view behind a Tree | Map switch. It's lower priority than the tree.
- **User-defined disciplines** in Settings: add, rename, recolor, change the short code, remove (only when unused).

---

## Data model

```ts
type Status = 0 | 1 | 2;               // 0 Not started · 1 In progress · 2 Done

interface Discipline {
  code: string;      // stable id. Built-ins: 'FE' | 'BE' | 'UX' | 'OT'; custom: 'd' + random
  tag: string;       // 1–3 chars, A–Z/0–9, shown in pills: FE, BE, UX, OTH, QA…
  name: string;      // "Frontend", "UI/UX", …
  hue: number|null;  // OKLCH hue; null = neutral (used for "Other")
}
interface Task    { id: string; title: string; d: string /* Discipline.code */; s: Status; notes: string }
interface Epic    { id: string; name: string; open: boolean; tasks: Task[] }
interface Project { id: string; name: string; desc: string; edited: string; epics: Epic[] }
```

Recommendations for the real build:
- Use string enums for status (`'todo' | 'doing' | 'done'`).
- Store `updatedAt` as an ISO timestamp and format it relatively ("2h ago"). The prototype stores a display string in `edited`.
- Store `epic.open` (expand state) as UI state, not domain data. Toggling it must **not** bump `updatedAt`. Any data change does.
- Keep array order as the display order. Reordering isn't designed yet.

`src/sample-data.json` contains the seed data: 4 projects, 79 tasks, and the default disciplines. It's in the same format as the app's JSON export.

### Progress rules
- `pct = round(done / total × 100)`, and `0` when there are no tasks.
- Every task counts equally. **In progress counts as 0.**
- The same formula is used for the project, each epic, each discipline across the project, and each discipline within an epic.
- Bars are stacked. Done is solid green and In progress is amber; the rest is track. In epic and panel bars, the In progress segment is drawn at 50% alpha.
- A percentage of 100 renders in done-green text, but only if the item has at least one task.

### Persistence (local only, no sign-in)
- The prototype uses localStorage key `plot.v1` (projects array) and `plot.v1.disciplines`. It saves on every change.
- **Export JSON:** `{ app:'plot', version:1, exported:ISO, disciplines, projects }`.
- **Export CSV:** columns `project, epic, task, discipline, status, notes`, using the discipline name and the status label.
- **Import JSON:** accepts that object, or a bare projects array. It replaces all current data, including disciplines if present.
- **Reset:** restores the sample data. Add a confirmation step in the build; the prototype has none.

---

## Screens / views

### App shell
- Full-height flex row: **sidebar 232px** plus main area (flex 1, scrolls independently).
- **Sidebar** (`#0a0b0d`, right border 1px `rgba(255,255,255,.06)`, padding 14/10/12):
  - **Logo mark:** a 16px square with a 1.5px `#ececee` border and radius 4. The bottom 55% is filled `#ececee`. Next to it, "Plot" in 14/600.
  - **Search button:** full width, `#121317`, 1px `rgba(255,255,255,.07)` border, radius 8, padding 7/8/7/10. Contains a 10px ring icon, the text "Search or add…" (12.5px, `#7d7e86`) and a `⌘K` key hint (Geist Mono 10.5, 1px border, radius 4). It opens the command palette.
  - **"All projects" row:** a 2×2 grid icon of 5px squares and the project count in mono.
  - **PROJECTS label:** mono 10.5, uppercase, letter-spacing .08em, `#6a6b73`, with a "+" button that opens New project.
  - **Project rows:** padding 7/10, radius 7. Each has a **14px progress ring**: a `conic-gradient(done pct%, rgba(255,255,255,.13) 0)` masked into a ring with `radial-gradient(circle, transparent 3.5px, #000 4px)`. Then the name (ellipsis) and the percentage (mono 11, `#6f7078`). The active row has background `rgba(255,255,255,.06)` and text `#ececee`; others are `#a1a2aa`. Hover is `rgba(255,255,255,.04)`.
  - **Footer** (top border): a Settings row, and a "Saved locally" line with a 6px green dot.

### 1. Project: Tree view (primary)
Content column: max-width 1040, centered, padding 20/36/72.

1. **Top bar** (space-between, wraps):
   - Breadcrumb "Projects / {name}" (12.5px; "Projects" is clickable).
   - **View switch** Tree | Map: segmented control, container `#0b0c0f`, 1px `rgba(255,255,255,.07)`, radius 8, padding 2. Segments are 5/11 padding, radius 6, 12px. Active: bg `rgba(255,255,255,.1)`, text `#ececee`. Inactive text `#8b8c94`. Each segment has a tiny CSS icon.
   - **"+ Epic"** primary button: bg `#ececee`, text `#0e0f12`, 12.5/500, radius 7, padding 6/12, hover `#fff`.
2. **Title** H1 26/600, letter-spacing −0.025em, margin-top 26. **Description** 13.5px `#8b8c94`, max-width 620.
3. **Progress card**: `#131418`, 1px `rgba(255,255,255,.06)`, radius 14, padding 20/22/18, gap 16.
   - **Big %:** Geist Mono 46/500, line-height .85, letter-spacing −0.05em. The "%" is 22px `#6f7078`.
   - Beside it: "Project complete" (13/500 `#d6d7db`) and "{done} of {total} tasks done · {n} epics" (12px `#7d7e86`).
   - Right side: legend Done / In progress / Not started, each with an 8px swatch and a mono count.
   - **Stacked bar:** 8px tall, radius 99, track `rgba(255,255,255,.06)`, animated `width .3s`.
   - **Discipline breakdown** (toggleable): top border, grid `repeat(auto-fit, minmax(150px,1fr))`, gap 12/22. Each cell has a tag pill, the name (12px `#a1a2aa`), the % (mono 12, `#d6d7db`; "—" when it has no tasks), a 3px bar in the discipline color, and "{done} of {total} done" (11px `#6f7078`).
4. **Toolbar** (margin-top 24, wraps):
   - **Left: discipline filter chips.** "All" plus one per discipline. Pills with padding 5/11, 1px border, 12px text, a 6px color dot and a mono count. Active: bg `rgba(255,255,255,.08)`, border `.12`, text `#ececee`.
   - **Right:**
     - **Bar / Squares / Grouped** mini segmented control (tree only; 3/9 padding, 11.5px).
     - **"Hide done"** switch: track 26×15, knob 11px `#ececee`. On is done-green, off is `rgba(255,255,255,.14)`.
     - **"Collapse all / Expand all"** text button.
5. **Tree container**: margin-top 12, radius 14, 1px border. Epics are separated by **1px gaps** over a `rgba(255,255,255,.06)` background; each epic block is `#111216`.
   - **Epic row** (the whole row is clickable and toggles open): padding 13/18/13/14, gap 12, hover `rgba(255,255,255,.02)`. It contains, in order:
     - Chevron: a CSS triangle (border-left 5px `#8b8c94`). It rotates 0→90° when open, `transform .15s`.
     - Index "01" (mono 11, `#5f6068`, width 18).
     - Name (14/500, −0.01em).
     - "{n} tasks" (12px `#6f7078`).
     - Flex spacer.
     - **Mode area:**
       - `bar` / `grouped`: an optional "{n} in progress" (11.5px amber), then a 140×5 bar.
       - `squares`: one cluster per discipline that has tasks, with gap 14 between clusters. Each cluster has its tag (mono 9.5, in the discipline color) and **10×10 squares**, radius 3, gap 3. Clicking a square opens the epic and expands that task. If the task is done, it also turns off "Hide done".
     - Pct (mono 12.5, width 40, right-aligned).
   - **Children** (when open): padding 0/14/12/22.
     - **Task row** wrapper: padding-left 26. It draws file-tree guides:
       - a vertical 1px `rgba(255,255,255,.09)` line at left 0;
       - a horizontal tick at top 20, width 16.

       The row itself: min-height 40, padding 4/6/4/8, radius 8, gap 12, hover `rgba(255,255,255,.025)`. It contains, in order:
       - **Discipline tag:** 32px wide, mono 10/500, padding 2/0, radius 4, discipline color text on a 14%-alpha tint.
       - **Title:** 13px `#e4e5e9`; done tasks use `#7d7e86`. Single line with ellipsis. Clicking it toggles the notes panel.
       - **Notes indicator:** 3 tiny lines, shown only if the task has notes.
       - **Status toggle** (see Components).
     - **Expanded notes:** margin 2/0/10/8, padding 12/14, `#0b0c0f`, 1px border, radius 10.
       - Borderless textarea (13px, line-height 1.55, placeholder "Add notes…").
       - Divider, then the row "Owner": one pill per discipline using the full name. Active pill uses tint + color. Inactive: 1px `rgba(255,255,255,.08)` border, `#8b8c94` text.
       - "Delete task" right-aligned; hover turns it danger red.
     - **Add-task row:** last child. Its guide is an elbow: border-left + border-bottom, bottom-left radius 6, height 20.
       - Idle: "+ Add task" (12.5px `#6f7078`, hover `#d6d7db`).
       - Active: an input row (`#0b0c0f`, 1px `rgba(255,255,255,.12)`, radius 8) with the input "Task name…", a pill per discipline tag (34px wide), and a hint "tab · ↵".
   - **`grouped` mode:** inside an open epic, each discipline with tasks gets a **group header row**. It shows the tag, the name (12.5/500 `#c4c5cb`), "{done} of {total} done", **8×8 squares** (radius 2), then the pct. Its tasks are indented: padding-left 62. A second vertical guide sits at left 50 and the tick runs from 50, width 12. Task tags are hidden in grouped rows because the header already says the discipline. When a filter is active, only matching groups appear.
   - **Last block:** "+ Add epic". When active, it becomes an inline input with the next index.

**Dense variant:** the same screen with `toggleStyle = glyphs`, hide-done on and the discipline breakdown off. These are user settings, not a separate screen.

### 2. Project: Map view (secondary)
- **Tiles grid:** `repeat(auto-fill, minmax(280px,1fr))`, gap 12.
- **Tile:** `#131418`, radius 14, padding 16/16/14, gap 14, hover border `.16`. When focused: bg `#17181d`, border `rgba(255,255,255,.28)`.
  - Header: "EPIC 01" (mono 10.5, .06em) over the name (14/500), and the pct on the right (mono 26).
  - A 4px stacked bar.
  - One row per discipline: the tag (mono 9.5, width 24) and **16×16 squares** (radius 4, gap 4).
    - Square colors: Done is green, In progress is amber, Not started is `rgba(255,255,255,.03)` with an inset 1px `rgba(255,255,255,.14)`.
    - Squares filtered out by a discipline filter or Hide done drop to opacity .18.
    - The selected task gets the ring `0 0 0 2px #0e0f12, 0 0 0 3.5px #ececee`.
  - Footer: "{done} done · {doing} in progress" and the task count.
- A **dashed "+ Add epic" tile** comes last.
- Clicking a tile toggles the **epic panel**. Clicking a square opens the panel with that task expanded.
- **Epic panel:** right side, 400px, `#0b0c0e`, left border.
  - Header: "EPIC 03 · 2/8 DONE", a close ×, the name (18/600), the pct (mono 24) and a 4px bar.
  - Task cards (padding 10, radius 10): the tag and a wrapping title, with the status toggle on the line below (indented 42px). Clicking the title expands notes and owner pills, as in the tree.
  - A dashed "+ Add task" button at the end.

### 3. Projects home
- Content max-width 1080, padding 44/36/72.
- **Header:** H1 "Projects" and "{n} projects · {tasks} tasks · {done} done" on the left. **"New project"** primary button on the right (padding 8/14, radius 8).
- **Cards grid:** `repeat(auto-fill, minmax(300px,1fr))`, gap 14.
- **Card:** `#131418`, radius 16, padding 20, gap 20. Hover border `.16`. The whole card opens the project.
  - Name (15/600), description (12.5px `#7d7e86`), and the pct on the right (mono 30).
  - **Epic strip:** one vertical bar per epic, height 38, gap 4, radius 4, track `rgba(255,255,255,.05)`. The fill height equals the epic pct, in green at 60% alpha (solid green at 100%). Under it, the label "EPICS" (mono 10).
  - Footer (top border): "{n} epics · {n} tasks" and "Edited {relative}".
- The last item is a **dashed ghost card**: "+ New project" with the line "Name it, list a few epics, go.".

### 4. New project (modal, 2 steps)
- Backdrop: `rgba(6,7,9,.6)` + `backdrop-filter: blur(3px)`. Clicking it closes the modal.
- Panel: 540px, `#15161a`, 1px `rgba(255,255,255,.09)`, radius 16, shadow `0 30px 90px rgba(0,0,0,.6)`. Top offset 84px.
- **Stepper:** 18px circles, "1 Details — 2 Epics". The active step is `#ececee` with dark text, a completed step is green, and an upcoming step is `rgba(255,255,255,.08)`. There's a close × at the right.
- **Step 1:** title "New project" and the line "Give it a name. Everything can be changed later.".
  - Name input (15px, `#0b0c0f`, radius 9, required). Enter continues.
  - Description textarea, marked optional.
- **Step 2:** title "Key epics for {name}" and the line "The big chunks of work. Tasks go inside each epic later.".
  - A numbered list of epics, each with a remove ×.
  - Inline input "Add an epic and press Enter".
  - "Common" suggestion chips: Discovery, Design, Build, QA & testing, Launch. Dashed pills; clicking one adds it.
  - Keys: Backspace in an empty input removes the last epic. Enter in an empty input with at least one epic creates the project.
- **Footer:** Cancel / ← Back on the left. The epic count and the primary button (Continue / Create project) on the right. The primary button sits at opacity .4 until a name exists.
- **Create:** inserts the project at the top of the list and navigates to it. It opens the add-task input on the first epic, or the add-epic input if there are no epics.

### 5. Command palette (⌘K / Ctrl+K)
- Same backdrop as the modal. Panel: 620px, radius 14, top offset 92.
- **Input:** 15px, placeholder "Search, run a command, or add a task…", with an "esc" key hint.
- **Results are grouped.** Each group has a header (mono 10.5, uppercase, `#5f6068`). Items: padding 9/10, radius 8, a 22px icon box, the label and a mono meta. The selected item has bg `rgba(255,255,255,.07)`; hovering selects.
  - **Quick add · {project}:** the parsed title, an epic chip and a discipline tag. Meta "add".
  - **Actions:** New project, Switch to Map/Tree view, All projects, Export data as JSON, Settings.
  - **Projects:** jump to any project, with its % as meta.
- **Quick-add syntax:**
  - `#tag` sets the discipline. It matches the tag, the code, or the name with spaces removed. Aliases: fe, frontend, be, backend, ux, ui, design, other, oth, ot.
  - `@word` picks the epic by prefix, then by substring.
  - The remaining words become the title.
  - Default epic: the focused epic, else the first incomplete epic with tasks, else the first epic. Default discipline: Other.
  - The quick-add row is listed first when the query contains `#` or `@`, or when nothing else matches. Otherwise it's listed last.
  - Example: `Wire up invoice filters #fe @bill` → "Wire up invoice filters", in Billing, owned by FE.
- **Keys:** ↑/↓ move the selection, Enter runs it, Esc closes. The footer explains the syntax.

### 6. Settings
Content max-width 760, padding 44/36/72, sections gap 34. Section label: mono 10.5, .08em, `#6a6b73`. Each section card is `#131418`, radius 14. Rows have padding 16/18 and a top border `rgba(255,255,255,.05)`; each row has a title (13.5/500) and a description (12.5px `#7d7e86`) on the left and a control on the right.
- **DATA**
  - Storage: shows "plot.v1 · {KB} KB".
  - Export: JSON and CSV buttons (`#1a1b20`, 1px `.1`, radius 7).
  - Import: "Choose file…" (.json).
- **DEFAULTS**
  - Project view: Tree | Map.
  - Status toggle: Labels | Glyphs.
  - Epic rows in the tree: Bar | Squares | Grouped.
  - Discipline breakdown: switch (32×18).
  - Hide done tasks: switch.
- **DISCIPLINES:** one row per discipline:
  - an editable **tag** (38px pill, uppercase A–Z/0–9, max 3 characters);
  - an editable **name** (transparent input; hover/focus shows a border);
  - **7 color swatches** (12px dots: hues 250, 300, 20, 200, 340, 110 and neutral). The selected swatch has the ring `0 0 0 2px #131418, 0 0 0 3.5px {color}`;
  - the task count, or "Unused";
  - a remove × that only works when the discipline is unused and more than one remains. Otherwise it's a dimmed × with a tooltip.

  The "+ Add discipline" row turns into an input:
  - the tag preview is auto-generated: initials if the name has several words, else the first 3 letters, made unique;
  - the color is the next unused hue from 200, 340, 110, 250, 300, 20;
  - Enter adds it. New disciplines are inserted before "Other".
- **Reset to sample data:** danger card (border `oklch(.74 .14 25 / .25)`) with a "Reset" button.

---

## Components

### Status toggle (core control)
- **Container:** inline-flex, padding 2, gap 1, bg `#0b0c0f` (`#121317` inside panels), 1px `rgba(255,255,255,.07)`, radius 8.
- **3 segments** (`button`): padding 4/9, radius 6, 11.5px, gap 6, `background .12s`. Each has a glyph, plus a label when the style is "labels".
- **Glyphs** (10px, color = `currentColor`):
  - Not started ○: ring, 1.5px border.
  - In progress ◐: ring, 1.5px border, padding 1.5, `background: conic-gradient(currentColor 0 50%, transparent 50% 100%) content-box`.
  - Done ●: solid fill.
- **Active styles:**
  - Not started: bg `rgba(255,255,255,.09)`, text `#ececee`.
  - In progress: bg `oklch(.82 .13 80 / .16)`, text `oklch(.87 .12 80)`.
  - Done: bg `oklch(.80 .14 150 / .16)`, text `oklch(.86 .13 150)`.
- **Inactive segments:** transparent, text `#7d7e86`.
- One click sets the status directly. There's no cycling and no menu. Give each segment a `title` (and an aria-label) for the glyph-only mode.

### Discipline tag
- Mono 10/500, fixed width (32px in rows, 38px in settings), centered, padding 2/0, radius 4.
- Text color `oklch(0.78 0.1 H)`, background `oklch(0.78 0.1 H / 0.14)`.
- Neutral ("Other"): `oklch(0.80 0.015 260)` on `/0.12`.

### Others
- **Chips / pills:** radius 99.
- **Switches:** track 26×15 (toolbar) or 32×18 (settings), padding 2, white knob; on = done-green.
- **Primary button:** `#ececee` on `#0e0f12`.
- **Secondary button:** `#1a1b20` + 1px `.1` border.
- **Ghost/dashed buttons:** dashed `.1–.16` borders.

---

## Interactions & behaviour
- **Esc:** closes any overlay. With no overlay open, it cancels the add inputs, collapses the open notes and closes the epic panel.
- **⌘K / Ctrl+K:** toggles the palette from anywhere.
- **Add task:** Enter adds the task and keeps the input open for rapid entry. Tab cycles the discipline. Esc closes. Adding a task to a collapsed epic opens it.
- **Add epic:** Enter adds and keeps the input open. Esc closes.
- **Filters and Hide done:**
  - In the tree, tasks that don't match are hidden.
  - In the map, they're dimmed to .18.
  - In the tree's `squares` mode, only the discipline filter dims squares (to .2); Hide done doesn't.
- **Notes** save as you type.
- **Transitions:** progress widths `width .3s`, chevron rotation `.15s`, tile border `.15s`, switch background `.15s`, toggle segment background `.12s`. Use ease (the browser default).
- **Responsive:** grids use auto-fill/auto-fit and the toolbars wrap. At narrow widths, collapse the sidebar into a drawer (not designed; use your judgment).
- **Empty states** are minimal:
  - an epic with no tasks shows only "+ Add task";
  - a map tile with no tasks says "No tasks yet. Open to add some.";
  - the epic panel says "No tasks here yet.";
  - the palette says "Nothing matches. Type a task name to add it."

### Not designed yet
These gaps exist in the prototype. Keep any solution consistent with the rest of the design:
- Renaming or deleting a project or an epic. Suggestion: double-click to rename inline, plus a small ⋯ menu on the epic row and project header.
- Reordering epics and tasks. Suggestion: drag handle on hover.
- A confirmation for Reset and Import.
- Moving a discipline's tasks to another discipline when removing it.
- Undo. A short toast with an "Undo" action after a delete is recommended.

## State (prototype reference)
| State | Values |
|---|---|
| `projects`, `pid` (current project) | data |
| `screen` | `'home' \| 'project' \| 'settings'` |
| `view` | `'tree' \| 'map'` |
| `detail` (epic row mode) | `'bar' \| 'squares' \| 'grouped'` |
| `tstyle` (toggle style) | `'labels' \| 'glyphs'` |
| `showDisc`, `hideDone` | booleans |
| `filter` | `'all' \| disciplineCode` |
| `focus` (map panel epic id), `openTask` (expanded task id) | ids |
| `adding` (epic id with the add-task input open), `draft`, `draftD` | add-task input |
| `addingEpic`, `epicDraft` | add-epic input |
| `overlay` | `'none' \| 'new' \| 'palette'` |
| `q`, `sel` | palette query and selection |
| `np` | `{step, name, desc, epics[], input}` |
| `discs`, `addingDisc`, `discDraft` | disciplines |

Persist `view`, `detail`, `tstyle`, `showDisc` and `hideDone` as user preferences. The prototype keeps them in memory only.

## Design tokens
**Fonts:** Geist (400/500/600) for UI; Geist Mono (400/500) for numbers, indices, tags and key hints. Both are on Google Fonts. Base size 13px, line-height 1.45, antialiased.

**Type scale:**

| Role | Size / weight | Font | Notes |
|---|---|---|---|
| H1 | 26/600 | Geist | −0.025em |
| Modal title | 20/600 | Geist | |
| Panel title | 18/600 | Geist | |
| Card title | 15/600 | Geist | |
| Epic name | 14/500 | Geist | |
| Body / task | 13 | Geist | |
| Small | 12–12.5 | Geist | |
| Micro label | 10.5/500 | Geist Mono | uppercase, .06–.08em |
| Tag | 10/500 | Geist Mono | |
| Big numbers | 46 / 30 / 26 / 24 | Geist Mono 500 | −0.05em |

**Surfaces:**

| Token | Value |
|---|---|
| app | `#0e0f12` |
| sidebar | `#0a0b0d` |
| card | `#131418` |
| tree block | `#111216` |
| inset / input | `#0b0c0f` |
| overlay panel | `#15161a` |
| side panel | `#0b0c0e` |
| raised button | `#1a1b20` |
| focused tile | `#17181d` |

**Text:**

| Token | Value |
|---|---|
| primary | `#ececee` |
| task | `#e4e5e9` |
| strong-2 | `#d6d7db` |
| `#c4c5cb` | breadcrumb current, group headers |
| secondary | `#a1a2aa` |
| tertiary | `#8b8c94` |
| muted | `#7d7e86` |
| faint | `#6f7078` |
| label | `#6a6b73` |
| index | `#5f6068` |
| separator | `#4a4b52` |

**Lines:**
- Default border `rgba(255,255,255,.06)`.
- Controls `.07`.
- Overlays `.09`.
- Inputs `.10–.12`.
- Hover `.14–.16`.
- Tree guides `.09`; grouped sub-guides `.07`.

**Status:**

| Status | Fill | Text | Tint |
|---|---|---|---|
| Done | `oklch(0.80 0.14 150)` | `oklch(0.86 0.13 150)` | `/0.16` |
| In progress | `oklch(0.82 0.13 80)` | `oklch(0.87 0.12 80)` | `/0.16` (bar segment `/0.5`) |
| Not started | — | — | active tint `rgba(255,255,255,.09)` |

**Discipline colors:** `oklch(0.78 0.1 H)` with a `/0.14` tint. Every discipline shares the same lightness and chroma; only the hue changes.

| Discipline | Hue |
|---|---|
| FE | 250 |
| BE | 300 |
| UI/UX | 20 |
| Extras | 200, 340, 110 |
| Other | neutral `oklch(0.80 0.015 260)` |

Avoid hues near 80 (amber) and 150 (green) so disciplines never read as statuses.

**Danger:** `oklch(0.74 0.14 25)` (borders at `/0.25` and `/0.4`), text `oklch(0.80 0.12 25)`.

**Radii:**

| Radius | Used for |
|---|---|
| 2–4 | squares, tags |
| 5–6 | segments, small buttons |
| 7–8 | buttons, controls, rows |
| 9–10 | inputs, notes, task cards |
| 14 | cards, tree, tiles, palette |
| 16 | home cards, modal |
| 99 | pills, chips, bars, switches |

**Shadows / effects:**
- Overlay panels: `0 30px 90px rgba(0,0,0,.6)`.
- Backdrop: `rgba(6,7,9,.6)` + `blur(3px)`.
- Selection: `oklch(0.78 0.1 250 / .35)`.

**Spacing:**
- Mostly 2/4/6/8/10/12/14/16/18/20/22/24/28/36/44.
- Row heights: 40 (task), about 46 (epic).
- Sidebar 232; side panel 400.

## Assets
- **No images.**
- The logo mark and all icons are pure CSS shapes: chevron triangle, rings, grid squares, note lines.
- The palette uses Unicode glyphs as icons: `+ ⇄ ▦ ↓ ≡ →`. In the build, swap these for a light icon set at about 12–14px, 1.5px stroke (for example Lucide).
- Fonts load from Google Fonts (Geist, Geist Mono).

## Files
- The HTML prototype and review board this handoff came with aren't kept in this repository. This document and the app itself are the reference now.
- **`src/sample-data.json`:** the seed data, in the export format.
