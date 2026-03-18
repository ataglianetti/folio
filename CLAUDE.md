# Folio

## Overview
Web App: Desktop markdown editor + Claude Code GUI wrapper built on Electron.
Stack: TypeScript + Electron 33 + React 19 + Zustand + CodeMirror 6 + Tailwind 4

## Architecture
Run `/map-codebase` to populate. Reference docs land in `.planning/codebase/`.

### Key Structure
```
src/
├── main/           # Electron main process
│   ├── index.ts    # Window, IPC handlers, menu, app lifecycle
│   ├── vault/      # Vault backend (indexer, parser, watcher, manager)
│   └── claude/     # Claude Code wrapper (run-manager, stream-parser,
│                   #   event-normalizer, permission-server, session-manager)
├── preload/        # contextBridge API (window.folio.vault + window.folio.claude)
└── renderer/       # React app
    ├── App.tsx
    ├── theme.ts    # Design tokens (clui-cc palette)
    ├── stores/     # Zustand (vault, ui, claude)
    ├── hooks/      # useClaudeEvents (RAF batching)
    ├── components/
    │   ├── editor/   # CodeMirror 6 live preview, TitleBar, PropertyHeader
    │   ├── sidebar/  # FileTree, SearchPanel, ResizeHandle
    │   └── chat/     # ChatPanel, MessageList, InputBar, ToolCard, PermissionCard
    ├── types/
    └── lib/
```

### Build
- `electron-vite` for build tooling
- Main + preload: SSR bundle (externalized deps)
- Preload: **must output `.cjs`** — `"type": "module"` in package.json makes `.js` ESM, Electron preload uses `require()`
- Renderer: Vite dev server in dev, static build in prod
- Native modules: `better-sqlite3` requires `electron-rebuild` after install

### IPC Layer
- Vault ops: `window.folio.vault.*` → `ipcMain.handle('folio:*')`
- Claude ops: `window.folio.claude.*` → `ipcMain.handle('folio:claude-*')`
- Events: main → renderer via `webContents.send()`, renderer subscribes via `ipcRenderer.on()`

### macOS Tahoe (26.x)
- **Explicit application menu required.** Default Electron menu crashes in `_addWindowTabsMenuItemsIfNeeded` on macOS 26.3. Set `Menu.setApplicationMenu()` before creating BrowserWindow.

## Agent Orchestration

### When to Use Agents vs Direct Work

| Task Size | Approach | Example |
|-----------|----------|---------|
| Trivial (<10 lines, one file) | Direct edit | Fix a typo, add a log statement |
| Small (one feature, 1-3 files) | Direct edit or single agent | Add a utility function, simple endpoint |
| Medium (feature, 3-8 files) | Planner → Implementer | New API endpoint with tests and validation |
| Large (cross-cutting, 8+ files) | Research → Plan → Implement (waves) → Verify → Review | Auth system, major refactor, new subsystem |

### How to Spawn Agents

1. Read the agent template from `.claude/agents/{agent}.md`
2. Use the Task tool with the template as part of the prompt
3. Include relevant context (codebase docs, prior agent output, specific files)
4. Set model based on current profile (see Model Profiles below)

Example:
```
Task: subagent_type=general-purpose, model={from profile}
Prompt: [agent template content]

Context: [what the agent needs to know]
Task: [specific work to do]
```

### Wave Execution

For multi-task plans from the planner:
1. Execute all tasks in Wave 1 in parallel (separate Task calls in one message)
2. Wait for Wave 1 to complete
3. Review results — adjust Wave 2 if needed
4. Execute Wave 2 tasks in parallel
5. Repeat until plan is complete
6. Run verifier against the original goal

### Model Profiles

Current profile is set in `.planning/STATE.md`. Default: `balanced`.

| Profile | Researcher | Planner | Implementer | Verifier | Debugger | Reviewer | Mapper |
|---------|-----------|---------|-------------|----------|----------|----------|--------|
| `quality` | opus | opus | opus | sonnet | opus | sonnet | sonnet |
| `balanced` | opus | opus | sonnet | sonnet | opus | sonnet | haiku |
| `budget` | sonnet | sonnet | sonnet | haiku | sonnet | haiku | haiku |

Override per-spawn by passing `model` explicitly to Task.

## Context Budget

### When to Spawn Fresh Agents
- Investigation is getting long (10+ file reads without clear direction)
- Switching from one subsystem to another
- After completing a wave — fresh context for each wave

### Save State Before Switching
When moving between tasks or subsystems, update `.planning/STATE.md`:
- What was just completed
- What's next
- Any blockers or open questions

## Worktree Patterns

### When to Use Worktrees
- Parallel implementation of independent features
- Exploratory changes that might be thrown away
- When two tasks touch the same files (avoid conflicts)

### Workflow
1. Use `isolation: "worktree"` parameter on Task tool
2. Agent works in isolated copy of the repo
3. If changes are good, merge the worktree branch
4. If changes are bad, discard the worktree

## Web App Conventions
- Component structure: one component per file in `src/renderer/components/{area}/`
- State management: Zustand stores in `src/renderer/stores/`
- Styling: Tailwind 4 utility classes + CSS custom properties from `theme.ts`
- All colors via CSS vars (never hardcoded hex in components)
- Dark theme default, clui-cc palette
- IPC: all main↔renderer communication through typed preload bridge
