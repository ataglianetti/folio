# Folio Roadmap — Ship in 6 Weeks

**Target ship date:** 2026-04-28
**Start:** 2026-03-17 (today)
**Approach:** 3 two-week phases. Each phase ends with a usable, testable build.

---

## What Folio Is

Desktop markdown editor + Claude Code GUI wrapper. Obsidian's vault model (folder-of-markdown, wikilinks, frontmatter, backlinks, full-text search) with a first-class Claude Code chat panel. The bet: your notes *are* the project context for an agentic coding assistant.

### Design Language
Dark-first glass aesthetic lifted from clui-cc. Warm terracotta accent (`#d97757`), muted earth-tone surfaces, `backdrop-filter: blur()` on popovers. CodeMirror 6 editor. Framer Motion for transitions.

### Inspirations
| Aspect | Source |
|--------|--------|
| Vault model, wikilinks, file tree, frontmatter | Obsidian |
| Glass surfaces, color palette, chat components | clui-cc (`github.com/lcoutodemos/clui-cc`) |
| AI side panel pattern | Cursor |
| CLI wrapper architecture | Claude Code itself |
| Editor engine | CodeMirror 6 (also used by Obsidian) |

---

## Current State (as of 2026-03-17)

### What Works
- Vault open/close, file tree, note read/write/create/delete
- CodeMirror editor with markdown syntax + live preview
- Full-text SQLite indexing (FTS), wikilink parsing, backlinks
- File watcher (chokidar) triggers re-index on change
- Claude Code subprocess (`claude -p --output-format stream-json`)
- Stream parsing → event normalization → renderer via IPC
- Chat panel: message list, input bar, tool cards, permission cards
- Permission server (HTTP hook settings for auto-approve/deny)
- Command palette (Cmd+K/P)
- Dark/light theme with CSS custom properties
- Auto-save on navigation

### What's Missing or Broken
See `.planning/codebase/CONCERNS.md` for full audit. Prioritized below.

---

## Phase 1: Harden & Fix (Weeks 1–2, Mar 17 – Mar 30)

Goal: Make what exists reliable. No new features — fix the foundation.

### P1-1. Path traversal fix (SECURITY)
- **Files:** `src/main/index.ts`, `src/main/vault/vault-manager.ts`
- **Work:** Add `realpath()` bounds check to all IPC handlers that accept paths. Reject paths that resolve outside vault root. Add `../` traversal tests.
- **Risk:** Low. Isolated change.

### P1-2. Session reset cancels active run
- **Files:** `src/main/claude/session-manager.ts`
- **Work:** Call `cancel()` before clearing state in `resetSession()`. Guard state updates with active requestId check.
- **Risk:** Low. One-line fix + guard.

### P1-3. Process cleanup guard in RunManager
- **Files:** `src/main/claude/run-manager.ts`
- **Work:** Add `isCleaningUp` flag. Block new run start until cleanup completes or times out. Not a full mutex — just a boolean gate.
- **Risk:** Low.

### P1-4. Temp file cleanup on exit
- **Files:** `src/main/claude/permission-server.ts`
- **Work:** Register `process.on('exit')` and `process.on('SIGTERM')` handlers to clean up `/tmp/folio-hook-config/`. Use UUID-per-run subdirectory.
- **Risk:** Low.

### P1-5. Indexing error visibility
- **Files:** `src/main/vault/vault-manager.ts`, `src/main/vault/indexer.ts`, `src/preload/index.ts`, `src/renderer/stores/vault.ts`
- **Work:** Emit `folio:index-error` event from main → renderer. Show transient error toast or status indicator in sidebar. Don't block UI on error.
- **Risk:** Medium. Touches IPC layer + adds new event type.

### P1-6. Glass surface CSS class + theme auto-sync
- **Files:** `src/renderer/index.css`, `src/renderer/theme.ts`
- **Work:** Add `.glass-surface` utility class (bg + border + shadow from vars). Refactor `applyTheme()` to auto-iterate palette keys via `camelToKebab()` → `--folio-*` vars, matching clui-cc's `syncTokensToCss()` pattern. Update components to use CSS vars instead of inline style objects.
- **Risk:** Medium. Touches every component that references `colors.*` inline, but can be done incrementally.

### P1-7. Auto-scroll with near-bottom detection
- **Files:** `src/renderer/components/chat/MessageList.tsx` (or equivalent)
- **Work:** Port clui-cc's `isNearBottomRef` pattern. Only auto-scroll if user hasn't scrolled up. Threshold: 60px from bottom.
- **Risk:** Low.

### Phase 1 Exit Criteria
- [ ] No path traversal possible via IPC
- [ ] Session reset is clean (no orphan processes, no stale state)
- [ ] Temp files cleaned on exit
- [ ] Index errors surface in UI
- [ ] `.glass-surface` class in use on at least chat panel + sidebar cards
- [ ] Chat doesn't jump-scroll when reading history

---

## Phase 2: Chat Panel Overhaul (Weeks 3–4, Mar 31 – Apr 13)

Goal: Bring chat UX to parity with clui-cc quality. This is the phase that makes Folio feel polished.

### P2-1. Message grouping + tool timeline
- **Files:** `src/renderer/components/chat/MessageList.tsx`, new `ToolTimeline.tsx`
- **Work:** Port `groupMessages()` from clui-cc. Consecutive tool messages become a `tool-group`. Render as collapsible vertical timeline (line + nodes + icons). Collapsed state shows `toolSummary()`. Running tools auto-expand.
- **Lift from:** `clui-cc/src/renderer/components/ConversationView.tsx` lines 32–55 (grouping), 658–788 (ToolGroup), 824–844 (ToolIcon)

### P2-2. Historical message optimization
- **Files:** `src/renderer/components/chat/MessageList.tsx`
- **Work:** Add `INITIAL_RENDER_CAP` (100) + pagination for older messages. `skipMotion` flag for messages before `historicalThreshold`. "Load older" button at top of scroll area.
- **Lift from:** `clui-cc/src/renderer/components/ConversationView.tsx` lines 59–168

### P2-3. Slash commands
- **Files:** New `src/renderer/components/chat/SlashCommandMenu.tsx`, update `InputBar.tsx`
- **Work:** Implement `/clear`, `/cost`, `/model`, `/help`. Autocomplete dropdown on `/` keystroke. Arrow keys to navigate, Tab/Enter to select.
- **Lift from:** `clui-cc/src/renderer/components/SlashCommandMenu.tsx`, `InputBar.tsx` lines 150–230

### P2-4. Popover system
- **Files:** New `src/renderer/components/PopoverLayer.tsx`, update `App.tsx`
- **Work:** Port `PopoverLayerProvider` + portal-based popovers with glass blur. Use for model picker, settings, and any future dropdowns.
- **Lift from:** `clui-cc/src/renderer/components/PopoverLayer.tsx`, `StatusBar.tsx` popover patterns

### P2-5. Permission card upgrade
- **Files:** `src/renderer/components/chat/PermissionCard.tsx`
- **Work:** Add `SENSITIVE_FIELD_RE` mask for token/password/key fields. Improve tool input preview formatting. Add queue counter badge (`+N more`).
- **Lift from:** `clui-cc/src/renderer/components/PermissionCard.tsx`

### P2-6. Chat status bar
- **Files:** New or updated `src/renderer/components/chat/StatusBar.tsx`
- **Work:** Bottom bar in chat panel showing: working directory, model picker, permission mode toggle (Ask/Auto), "Open in CLI" button. Uses popover system from P2-4.
- **Lift from:** `clui-cc/src/renderer/components/StatusBar.tsx`

### P2-7. Copy button on assistant messages
- **Files:** `src/renderer/components/chat/MessageList.tsx`
- **Work:** Hover-reveal copy button on assistant messages. CSS `:hover` → opacity transition (no React state needed for show/hide). Clipboard API + "Copied" confirmation.
- **Lift from:** `clui-cc/src/renderer/components/ConversationView.tsx` lines 320–352

### Phase 2 Exit Criteria
- [ ] Tool calls render as collapsible timeline, not flat cards
- [ ] 500+ message conversations don't lag (pagination + skipMotion)
- [ ] `/clear`, `/cost`, `/model` commands work
- [ ] Popovers render with glass blur
- [ ] Sensitive tool inputs masked in permission card
- [ ] Model + permission mode switchable from chat status bar
- [ ] Copy button on assistant responses

---

## Phase 3: Editor + Polish + Ship (Weeks 5–6, Apr 14 – Apr 28)

Goal: Make the editor experience competitive, polish rough edges, and ship.

### P3-1. Editor property header
- **Files:** `src/renderer/components/editor/PropertyHeader.tsx`
- **Work:** Render frontmatter as pill tags above editor (type, created, tags). Click to edit. Matches glass surface aesthetic.

### P3-2. Vault search improvements
- **Files:** `src/renderer/components/sidebar/SearchPanel.tsx`, `src/main/vault/indexer.ts`
- **Work:** Add `LIMIT` to search queries (prevent DB lock on large vaults). Add result count. Highlight matches. Debounce input (300ms).

### P3-3. Backlinks panel
- **Files:** New `src/renderer/components/sidebar/BacklinksPanel.tsx`
- **Work:** Show which notes link to the current note. Render as clickable list in sidebar. Uses existing `VaultManager.getBacklinks()`.

### P3-4. Note creation UX
- **Files:** `src/renderer/components/sidebar/FileTree.tsx`, `src/renderer/stores/vault.ts`
- **Work:** Inline rename on new note creation (not dialog). Support note types (daily, default) with frontmatter templates. Cmd+N shortcut.

### P3-5. Keyboard shortcuts
- **Files:** `src/renderer/App.tsx`, possibly new `src/renderer/lib/shortcuts.ts`
- **Work:** Cmd+S (save), Cmd+N (new note), Cmd+Shift+L (toggle chat — already exists), Cmd+B (toggle sidebar), Cmd+E (toggle editor/preview). Show in command palette.

### P3-6. Window state persistence
- **Files:** `src/main/index.ts`
- **Work:** Save/restore window size, position, sidebar width, chat width, last open vault, last open note. Use `electron-store` or write to `~/.folio/state.json`.

### P3-7. Error handling pass
- **Files:** Throughout
- **Work:** Audit all `console.error` calls. Replace with user-visible error toasts where appropriate. Add error boundary in React. Ensure no silent failures in IPC handlers.

### P3-8. Build + packaging
- **Files:** `package.json`, `electron-builder` config
- **Work:** Add `electron-builder` config for macOS DMG. Code signing (if Apple dev account available). Auto-update via `electron-updater` (stretch). App icon. `postinstall` script for `electron-rebuild`.

### P3-9. Dependency audit
- **Files:** `package.json`
- **Work:** Pin TypeScript to `5.7.3`. Evaluate Electron 34/35 upgrade (test on macOS Tahoe). Update `better-sqlite3` if API-compatible. Don't do major framework upgrades — just patch versions for security.

### Phase 3 Exit Criteria
- [ ] Frontmatter renders as editable pills
- [ ] Search is fast on 1000+ note vaults
- [ ] Backlinks visible in sidebar
- [ ] Note creation feels native (inline rename, Cmd+N)
- [ ] All major keyboard shortcuts work
- [ ] Window state persists across launches
- [ ] No silent errors — user sees meaningful feedback
- [ ] Builds to DMG on macOS
- [ ] Dependencies at safe patch versions

---

## Out of Scope (Post-Ship)

These are real features but not needed for initial ship:

- **Tab system** — Multi-session tabs (clui-cc has this). Single session is fine for v1.
- **Voice input** — Mic → transcription. Cool but not core.
- **Marketplace / skills** — clui-cc's plugin system. Premature for Folio.
- **Sync** — iCloud/Git-based vault sync. Vault-on-disk is the v1 model.
- **Mobile** — Not an Electron concern.
- **Wikilink hover preview** — Nice-to-have, not blocking.
- **Graph view** — Obsidian's signature feature. Big investment, punt.
- **Themes / custom CSS** — Ship with dark default. Light mode already works. Custom themes later.
- **Electron major upgrade** — 33 → 35+ is a separate effort. Don't mix with feature work.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| macOS Tahoe crashes on Electron 33 | Medium | High | Explicit menu workaround already in place. Test on Tahoe every phase. |
| `better-sqlite3` rebuild fails in CI/packaging | Medium | High | Add `postinstall` script. Test DMG build in Phase 3 early. |
| Chat panel overhaul takes longer than 2 weeks | Medium | Medium | P2 items are mostly port-from-clui-cc, not greenfield. Prioritize grouping + timeline over slash commands if tight. |
| Claude Code CLI output format changes | Low | High | Pin to known CLI version in docs. Stream parser already handles unknown events gracefully. |
| Editor performance on large notes | Low | Medium | CodeMirror 6 handles large docs well. Only worry if users report. |

---

## Weekly Checkpoints

| Week | Date | Milestone |
|------|------|-----------|
| 1 | Mar 24 | P1-1 through P1-4 done (security + stability fixes) |
| 2 | Mar 30 | P1-5 through P1-7 done (theme refactor + scroll fix). **Phase 1 complete.** |
| 3 | Apr 6 | P2-1 through P2-3 done (message grouping, timeline, slash commands) |
| 4 | Apr 13 | P2-4 through P2-7 done (popovers, permission upgrade, status bar, copy). **Phase 2 complete.** |
| 5 | Apr 20 | P3-1 through P3-5 done (editor polish, search, backlinks, shortcuts) |
| 6 | Apr 28 | P3-6 through P3-9 done (persistence, error handling, build, deps). **Ship.** |

---

## Reference Files

| Doc | Location | Purpose |
|-----|----------|---------|
| Architecture | `.planning/codebase/ARCHITECTURE.md` | Layer diagram, data flows, key abstractions |
| Structure | `.planning/codebase/STRUCTURE.md` | Directory layout, naming conventions |
| Conventions | `.planning/codebase/CONVENTIONS.md` | Code style, patterns, do/don't |
| Concerns | `.planning/codebase/CONCERNS.md` | Tech debt audit (input to Phase 1) |
| Stack | `.planning/codebase/STACK.md` | Dependencies, build commands |
| Testing | `.planning/codebase/TESTING.md` | No tests yet — framework recommendations |
| clui-cc source | `/Users/echowreck/Projects/clui-cc/` | UI reference for chat components |
