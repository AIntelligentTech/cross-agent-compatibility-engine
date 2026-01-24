# Agent Artifact Compatibility Matrix (2026)

## Research Summary

This document synthesizes research on agent artifact formats across major AI
coding assistants as of January 2026.

---

## 1. Artifact Type Taxonomy

### 1.1 Memory/Context Files

| Agent           | Primary File    | Location                               | Format        | Hierarchical    | Imports                         |
| --------------- | --------------- | -------------------------------------- | ------------- | --------------- | ------------------------------- |
| **Claude Code** | `CLAUDE.md`     | Project root, `.claude/`, `~/.claude/` | Markdown      | ✅ Yes          | ✅ `@path/to/file`              |
| **Windsurf**    | Memories (auto) | In-app storage                         | JSON/Internal | ❌ No           | ❌ No                           |
| **Cursor**      | `AGENTS.md`     | Project root, subdirs                  | Markdown      | ✅ Yes (nested) | ❌ No                           |
| **OpenCode**    | `AGENTS.md`     | Project root, `~/.config/opencode/`    | Markdown      | ✅ Yes          | ✅ Via `instructions` in config |
| **Gemini CLI**  | `GEMINI.md`     | Project root, `~/.gemini/`, subdirs    | Markdown      | ✅ Yes          | ✅ `@import`                    |
| **Universal**   | `AGENTS.md`     | Project root                           | Markdown      | ✅ Yes          | ❌ No                           |

### 1.2 Rules/Guidelines

| Agent           | File/Location                | Format                 | Glob Support                  | Always Apply           | Agent-Decided     |
| --------------- | ---------------------------- | ---------------------- | ----------------------------- | ---------------------- | ----------------- |
| **Claude Code** | `.claude/rules/*.md`         | YAML frontmatter + MD  | ✅ `paths:`                   | ✅ (no paths)          | ✅ (with paths)   |
| **Windsurf**    | `.windsurf/rules/*.md`       | YAML frontmatter + MD  | ✅ `globs:`                   | ✅ `alwaysApply: true` | ✅ `description:` |
| **Cursor**      | `.cursor/rules/*.mdc`        | YAML frontmatter + MD  | ✅ `globs:`                   | ✅ `alwaysApply: true` | ✅ `description:` |
| **OpenCode**    | `AGENTS.md` + `instructions` | Markdown + JSON config | ✅ Via glob in `instructions` | ✅ Always              | ❌ No             |
| **Gemini CLI**  | `GEMINI.md` sections         | Plain Markdown         | ❌ No                         | ✅ Always              | ❌ No             |

### 1.3 Skills/Workflows/Commands

| Agent           | Type     | Location                           | Format                | Invocation       | Auto-Invoke               |
| --------------- | -------- | ---------------------------------- | --------------------- | ---------------- | ------------------------- |
| **Claude Code** | Skill    | `.claude/skills/<name>/SKILL.md`   | YAML frontmatter + MD | `/skill-name`    | ✅ Progressive disclosure |
| **Windsurf**    | Skill    | `.windsurf/skills/<name>/SKILL.md` | YAML frontmatter + MD | Auto/Manual      | ✅ Progressive disclosure |
| **Windsurf**    | Workflow | `.windsurf/workflows/<name>.md`    | YAML frontmatter + MD | `/workflow-name` | ❌ Manual only            |
| **OpenCode**    | Skill    | `.opencode/skills/<name>/SKILL.md` | YAML frontmatter + MD | `skill()` tool   | ✅ Progressive disclosure |
| **OpenCode**    | Command  | `.opencode/commands/<name>.md`     | YAML frontmatter + MD | `/command-name`  | ❌ Manual only            |
| **OpenCode**    | Agent    | `.opencode/agents/<name>.md`       | YAML frontmatter + MD | `@agent-name`    | ❌ Manual                 |
| **Cursor**      | Command  | `.cursor/commands/<name>.md`       | Plain Markdown        | Manual           | ❌ No                     |

### 1.4 Hooks/Lifecycle Events

| Agent           | Config Location         | Events                                                        | Format       | Blocking       |
| --------------- | ----------------------- | ------------------------------------------------------------- | ------------ | -------------- |
| **Claude Code** | `.claude/settings.json` | PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd, etc. | JSON + Shell | ✅ Exit code 2 |
| **Windsurf**    | `.windsurf/hooks.json`  | pre_read_code, post_write_code, pre_run_command, etc.         | JSON + Shell | ✅ Exit codes  |
| **OpenCode**    | N/A                     | ❌ Not supported (uses permissions instead)                   | -            | -              |
| **Cursor**      | N/A                     | ❌ Not supported                                              | -            | -              |
| **Gemini CLI**  | N/A                     | ❌ Not supported                                              | -            | -              |

---

## 2. Feature Comparison Matrix

### 2.1 Memory File Features

| Feature               | Claude                   | Windsurf              | Cursor                | OpenCode                                | Gemini                   |
| --------------------- | ------------------------ | --------------------- | --------------------- | --------------------------------------- | ------------------------ |
| Project-level context | ✅ `CLAUDE.md`           | ✅ Auto-memories      | ✅ `AGENTS.md`        | ✅ `AGENTS.md`                          | ✅ `GEMINI.md`           |
| User-level context    | ✅ `~/.claude/CLAUDE.md` | ✅ `global_rules.md`  | ✅ User Rules         | ✅ `~/.config/opencode/AGENTS.md`       | ✅ `~/.gemini/GEMINI.md` |
| System-level context  | ✅ `/etc/claude-code/`   | ✅ Enterprise rules   | ✅ Team Rules         | ❌ No                                   | ❌ No                    |
| Local overrides       | ✅ `CLAUDE.local.md`     | ❌ No                 | ❌ No                 | ❌ No                                   | ❌ No                    |
| File imports          | ✅ `@path/to/file`       | ❌ No                 | ❌ No                 | ✅ `instructions` in JSON               | ✅ `@import`             |
| Subdirectory scoping  | ✅ `.claude/rules/`      | ✅ `.windsurf/rules/` | ✅ Nested `AGENTS.md` | ✅ Traverses up to git root             | ✅ Subdir `GEMINI.md`    |
| Claude Code fallback  | N/A                      | ❌ No                 | ❌ No                 | ✅ Reads `CLAUDE.md`, `.claude/skills/` | ❌ No                    |

### 2.2 Rule/Guideline Features

| Feature                      | Claude        | Windsurf               | Cursor                 |
| ---------------------------- | ------------- | ---------------------- | ---------------------- |
| Glob-based activation        | ✅ `paths:`   | ✅ `globs:`            | ✅ `globs:`            |
| Description-based activation | ❌ No         | ✅ `description:`      | ✅ `description:`      |
| Always-apply mode            | ✅ (no paths) | ✅ `alwaysApply: true` | ✅ `alwaysApply: true` |
| Manual invocation            | ❌ No         | ❌ No                  | ✅ `@mention`          |
| Team/Enterprise rules        | ❌ No         | ✅ System-level        | ✅ Team Rules          |
| Remote rules (GitHub)        | ❌ No         | ❌ No                  | ✅ Yes                 |

### 2.3 Skill/Workflow Features

| Feature                    | Claude Skill      | Windsurf Skill    | Windsurf Workflow   | OpenCode Skill    | OpenCode Command            | Cursor Command |
| -------------------------- | ----------------- | ----------------- | ------------------- | ----------------- | --------------------------- | -------------- |
| YAML frontmatter           | ✅ Required       | ✅ Required       | ✅ Required         | ✅ Required       | ✅ Required                 | ❌ Optional    |
| `name` field               | ✅ Yes            | ✅ Yes            | ❌ No (filename)    | ✅ Yes            | ❌ No (filename)            | ❌ No          |
| `description` field        | ✅ Yes            | ✅ Yes            | ✅ Yes              | ✅ Yes            | ✅ Yes                      | ❌ No          |
| `argument-hint`            | ✅ Yes            | ❌ No             | ❌ No               | ❌ No             | ✅ `$ARGUMENTS`, `$1`, `$2` | ❌ No          |
| `disable-model-invocation` | ✅ Yes            | ❌ No             | ❌ No               | ❌ No             | ❌ No                       | ❌ No          |
| `user-invocable`           | ✅ Yes            | ❌ No             | ❌ No               | ❌ No             | ✅ Yes                      | ❌ No          |
| `context: fork`            | ✅ Yes            | ❌ No             | ❌ No               | ❌ No             | ✅ `subtask: true`          | ❌ No          |
| `agent` (sub-agent)        | ✅ Yes            | ❌ No             | ❌ No               | ❌ No             | ✅ `agent:` field           | ❌ No          |
| `allowed-tools`            | ✅ Yes            | ❌ No             | ❌ No               | ❌ No             | ❌ No                       | ❌ No          |
| `model` preference         | ✅ Yes            | ❌ No             | ❌ No               | ❌ No             | ✅ `model:` field           | ❌ No          |
| Supporting files           | ✅ Same directory | ✅ Same directory | ❌ No               | ✅ Same directory | ❌ No                       | ❌ No          |
| Slash command invoke       | ✅ `/skill-name`  | ❌ No             | ✅ `/workflow-name` | ❌ `skill()` tool | ✅ `/command-name`          | ❌ No          |
| Auto-invoke                | ✅ Progressive    | ✅ Progressive    | ❌ No               | ✅ Progressive    | ❌ No                       | ❌ No          |
| Shell output injection     | ❌ No             | ❌ No             | ❌ No               | ❌ No             | ✅ `!\`command\``           | ❌ No          |
| File reference in prompt   | ❌ No             | ❌ No             | ❌ No               | ❌ No             | ✅ `@filename`              | ❌ No          |

### 2.4 Hook/Lifecycle Features

| Feature               | Claude Code                 | Windsurf                                             |
| --------------------- | --------------------------- | ---------------------------------------------------- |
| Pre-tool hooks        | ✅ PreToolUse               | ✅ pre_read_code, pre_write_code, pre_run_command    |
| Post-tool hooks       | ✅ PostToolUse              | ✅ post_read_code, post_write_code, post_run_command |
| Session hooks         | ✅ SessionStart, SessionEnd | ❌ No                                                |
| Prompt hooks          | ✅ UserPromptSubmit         | ✅ pre_user_prompt                                   |
| Response hooks        | ❌ No                       | ✅ post_cascade_response                             |
| Stop/completion hooks | ✅ Stop, SubagentStop       | ❌ No                                                |
| MCP tool hooks        | ✅ Yes                      | ✅ pre_mcp_tool_use, post_mcp_tool_use               |
| Blocking capability   | ✅ Exit code 2              | ✅ Exit codes                                        |
| Tool filtering        | ✅ `matcher` by tool name   | ✅ By event type                                     |
| JSON input            | ✅ Yes                      | ✅ Yes                                               |
| JSON output           | ✅ Yes                      | ✅ Yes                                               |

---

## 3. Conversion Feasibility Matrix

### 3.1 Memory Files

| From → To     | Claude    | Windsurf         | Cursor    | OpenCode           | Gemini    | Fidelity |
| ------------- | --------- | ---------------- | --------- | ------------------ | --------- | -------- |
| **Claude**    | -         | ⚠️ Loses imports | ✅ Direct | ✅ Native fallback | ✅ Direct | 70-95%   |
| **Windsurf**  | ✅ Direct | -                | ✅ Direct | ✅ Direct          | ✅ Direct | 90%      |
| **Cursor**    | ✅ Direct | ✅ Direct        | -         | ✅ Native          | ✅ Direct | 95%      |
| **OpenCode**  | ✅ Direct | ✅ Direct        | ✅ Native | -                  | ✅ Direct | 95%      |
| **Gemini**    | ✅ Direct | ✅ Direct        | ✅ Direct | ✅ Direct          | -         | 90%      |
| **AGENTS.md** | ✅ Direct | ✅ Direct        | ✅ Native | ✅ Native          | ✅ Direct | 95%      |
| **OpenCode**  | ✅ Direct | ✅ Direct        | ✅ Native | -                  | ✅ Direct | 95%      |

### 3.2 Rules

| From → To    | Claude Rules           | Windsurf Rules         | Cursor Rules           | Fidelity |
| ------------ | ---------------------- | ---------------------- | ---------------------- | -------- |
| **Claude**   | -                      | ⚠️ `paths:` → `globs:` | ⚠️ `paths:` → `globs:` | 85%      |
| **Windsurf** | ⚠️ `globs:` → `paths:` | -                      | ✅ Similar format      | 90%      |
| **Cursor**   | ⚠️ `globs:` → `paths:` | ✅ Similar format      | -                      | 90%      |

### 3.3 Skills/Workflows

| From → To             | Claude Skill       | Windsurf Skill                               | Windsurf Workflow      | OpenCode Skill       | OpenCode Command     | Cursor Command     | Fidelity |
| --------------------- | ------------------ | -------------------------------------------- | ---------------------- | -------------------- | -------------------- | ------------------ | -------- |
| **Claude Skill**      | -                  | ⚠️ Loses `context`, `agent`, `allowed-tools` | ⚠️ Loses many features | ✅ Native fallback   | ⚠️ Loses structure   | ⚠️ Loses structure | 60-95%   |
| **Windsurf Skill**    | ✅ Good mapping    | -                                            | ⚠️ Different purpose   | ✅ Good mapping      | ⚠️ Loses structure   | ⚠️ Loses structure | 70-85%   |
| **Windsurf Workflow** | ✅ Good mapping    | ⚠️ Different purpose                         | -                      | ⚠️ Different purpose | ✅ Good mapping      | ⚠️ Loses slash cmd | 75-85%   |
| **OpenCode Skill**    | ✅ Native fallback | ✅ Good mapping                              | ⚠️ Different purpose   | -                    | ⚠️ Different purpose | ⚠️ Loses structure | 80-95%   |
| **OpenCode Command**  | ⚠️ Infer structure | ⚠️ Infer structure                           | ✅ Good mapping        | ⚠️ Different purpose | -                    | ⚠️ Loses features  | 70-80%   |
| **Cursor Command**    | ⚠️ Infer structure | ⚠️ Infer structure                           | ⚠️ Infer structure     | ⚠️ Infer structure   | ✅ Good mapping      | -                  | 60-70%   |

### 3.4 Hooks

| From → To    | Claude Hooks             | Windsurf Hooks           | Fidelity |
| ------------ | ------------------------ | ------------------------ | -------- |
| **Claude**   | -                        | ⚠️ Different event names | 70%      |
| **Windsurf** | ⚠️ Different event names | -                        | 70%      |

---

## 4. Key Findings

### 4.1 Universal Standard: AGENTS.md

- **Adoption**: 60k+ open-source projects
- **Supported by**: OpenAI Codex, Google Jules, Cursor, Windsurf, Aider, Gemini
  CLI, VS Code, GitHub Copilot, and many more
- **Format**: Plain markdown, no frontmatter required
- **Best for**: Cross-agent compatibility, simple project instructions

### 4.2 Claude Code Unique Features

- **Fork context**: Isolated execution environment
- **Sub-agents**: Delegate to specialized agents (Explore, etc.)
- **Tool restrictions**: `allowed-tools` for security
- **Import system**: `@path/to/file` for modular configs
- **Local overrides**: `CLAUDE.local.md` for personal settings

### 4.3 Windsurf Unique Features

- **Auto-memories**: System-generated context
- **Skills + Workflows**: Two distinct artifact types
- **Progressive disclosure**: Intelligent skill invocation
- **Cascade hooks**: Comprehensive lifecycle events

### 4.4 Cursor Unique Features

- **Team Rules**: Enterprise-managed rules
- **Remote Rules**: GitHub-synced rules
- **Agent Skills import**: External skill packages
- **Nested AGENTS.md**: Subdirectory scoping

### 4.5 OpenCode Unique Features (Jan 2026)

- **Claude Code Compatibility**: Native fallback to `CLAUDE.md` and
  `.claude/skills/`
- **AGENTS.md Native**: Uses `AGENTS.md` as primary context file (same as
  universal standard)
- **Flexible Instructions**: `instructions` array in `opencode.json` supports
  globs, URLs, and remote files
- **Custom Agents**: Markdown-defined agents with `mode: primary` or
  `mode: subagent`
- **Skills with Permissions**: Pattern-based skill permissions (`allow`, `deny`,
  `ask`)
- **Commands with Shell**: Commands can inject shell output via `!\`command\``
  syntax
- **File References**: Commands support `@filename` for automatic file inclusion
- **Agent Invocation**: `@agent-name` mention syntax for switching agents
- **Precedence Order**: `AGENTS.md` > `CLAUDE.md` > `CONTEXT.md` (first match
  wins)
- **Remote Instructions**: Load rules from URLs with 5-second timeout
- **Temperature Control**: Per-agent temperature settings (0.0-1.0)
- **Max Steps**: Limit agentic iterations per agent

### 4.6 Gemini CLI Unique Features

- **Hierarchical context**: Global → Project → Subdir
- **Import system**: Similar to Claude's `@import`
- **Custom commands**: `.toml` configuration

---

## 5. Recommended Extensions to Compatibility Engine

### 5.1 New Artifact Types to Support

1. **Memory Files**
   - `CLAUDE.md` (with imports)
   - `AGENTS.md` (universal)
   - `GEMINI.md`
   - Auto-generated memories (Windsurf)

2. **Rules**
   - Claude `.claude/rules/*.md`
   - Windsurf `.windsurf/rules/*.md`
   - Cursor `.cursor/rules/*.mdc`

3. **Hooks**
   - Claude `settings.json` hooks
   - Windsurf `hooks.json`

### 5.2 New ComponentSpec Fields

```typescript
interface ExtendedComponentSpec {
  // Existing fields...

  // New: Rule-specific
  activation: {
    globs?: string[]; // File patterns
    paths?: string[]; // Claude-style paths
    alwaysApply?: boolean; // Always include
    agentDecided?: boolean; // Let agent decide
    description?: string; // For agent decision
  };

  // New: Hook-specific
  hooks?: {
    event: HookEvent;
    matcher?: string;
    command: string;
    timeout?: number;
  }[];

  // New: Memory-specific
  imports?: string[]; // @path/to/file imports
  scope?: "global" | "user" | "project" | "local";
}
```

### 5.3 Conversion Strategies

| Conversion                       | Strategy                 |
| -------------------------------- | ------------------------ |
| Claude imports → Others          | Inline imported content  |
| Claude `context: fork` → Others  | Add warning comment      |
| Claude `allowed-tools` → Others  | Document in body         |
| Windsurf `description:` → Claude | Use as body header       |
| Cursor Team Rules → Others       | Convert to project rules |
| Hooks Claude ↔ Windsurf          | Map event names          |

---

## 6. Implementation Priority

### Phase 1: Memory Files (High Impact)

- AGENTS.md parser/renderer (universal)
- CLAUDE.md with imports
- GEMINI.md support
- Bidirectional conversion

### Phase 2: Rules (High Impact)

- Claude rules parser/renderer
- Windsurf rules parser/renderer
- Cursor rules parser/renderer
- Glob ↔ paths conversion

### Phase 3: Hooks (Medium Impact)

- Claude hooks parser/renderer
- Windsurf hooks parser/renderer
- Event name mapping

### Phase 4: Advanced Features (Lower Priority)

- Import resolution and inlining
- Team/Enterprise rules handling
- Remote rules fetching

---

## 7. Slash Command Behavior Deep Dive

This section documents the detailed behavior of slash commands across agents,
including chaining, positioning, arguments, and execution semantics.

### 7.1 Slash Command Invocation Comparison

| Feature                             | Claude Code                       | Windsurf                           | OpenCode                          | Cursor                       |
| ----------------------------------- | --------------------------------- | ---------------------------------- | --------------------------------- | ---------------------------- |
| **Invocation syntax**               | `/skill-name`                     | `/workflow-name`                   | `/command-name`                   | `/command-name`              |
| **Location in prompt**              | Anywhere (v2.1.0+)                | Anywhere                           | Start of message                  | Anywhere                     |
| **Full prompt passed**              | ✅ Yes                            | ✅ Yes (entire user message)       | ✅ Yes (`$ARGUMENTS`)             | ✅ Yes (text after command)  |
| **Multiple commands in one prompt** | ✅ Yes (via SlashCommand tool)    | ✅ Yes (entire message as context) | ❌ No (one per message)           | ✅ Yes (can chain)           |
| **Position matters**                | ❌ No (v2.1.0+)                   | ❌ No (full message context)       | ✅ Must be at start               | ❌ No (full message context) |
| **Arguments after command**         | ✅ `$ARGUMENTS`, `$0`, `$1`, `$2` | ✅ Full message as context         | ✅ `$ARGUMENTS`, `$1`, `$2`, etc. | ✅ Full message as context   |
| **Chaining mechanism**              | Via SlashCommand tool             | Via "Call /workflow-2" in body     | Via command body instructions     | Via text after command       |

### 7.2 Argument Passing Semantics

| Agent           | Syntax                         | Example                                                         | Positional Args   | Named Args                  |
| --------------- | ------------------------------ | --------------------------------------------------------------- | ----------------- | --------------------------- |
| **Claude Code** | `$ARGUMENTS`, `$0`, `$1`, `$2` | `/deploy staging prod` → `$0`="staging", `$1`="prod"            | ✅ Yes (v2.1.19+) | ❌ No                       |
| **Windsurf**    | N/A (use workflow steps)       | N/A                                                             | ❌ No             | ❌ No                       |
| **OpenCode**    | `$ARGUMENTS`, `$1`, `$2`, `$3` | `/create-file config.json src` → `$1`="config.json", `$2`="src" | ✅ Yes            | ✅ Via `$NAME` placeholders |
| **Cursor**      | `@file` references             | `/test @src/utils.ts`                                           | ❌ No             | ❌ No                       |

### 7.3 Command Chaining Behavior

#### Claude Code (v2.1.0+ - Jan 2026)

- **SlashCommand tool**: Claude can programmatically invoke multiple commands
  via the `SlashCommand` tool
- **Anywhere in input**: Slash command autocomplete works when `/` appears
  anywhere in input, not just at the beginning (v2.1.0+)
- **Positional arguments**: Support for `$0`, `$1`, `$2` shorthand for
  individual arguments (v2.1.19+)
- **Model-invoked chaining**: Claude can autonomously invoke skills (unless
  `disable-model-invocation: true`)
- **Subagent chaining**: Skills with `context: fork` run in isolated subagents
- **Composable workflows**: An orchestration command like `/deploy-full` can
  invoke `/run-tests`, then `/build`, then `/deploy-staging` sequentially

```markdown
# Example: Claude skill using SlashCommand tool for chaining

---

name: deploy-full description: Full deployment pipeline

---

Execute the full deployment pipeline:

1. Use SlashCommand to invoke /run-tests
2. Use SlashCommand to invoke /build
3. Use SlashCommand to invoke /deploy-staging
4. Verify deployment succeeded
```

#### Windsurf

- **Workflow chaining supported**: Workflows can explicitly call other workflows
- **Sequential execution**: Steps are processed in order
- **Explicit chaining syntax**: Use "Call /workflow-2" in workflow body

```markdown
# Example: Windsurf workflow chaining

---

## description: Full deployment pipeline

1. Run the test suite
2. Call /build-workflow
3. Call /deploy-workflow
4. Verify deployment succeeded
```

#### OpenCode

- **Single command per message**: Only one `/command-name` per user input
- **Chaining via instructions**: Commands can reference other commands in their
  body
- **Subtask mode**: Commands with `subtask: true` run in isolated context
- **Agent switching**: Commands can specify `agent:` to use different agents

```markdown
# Example: OpenCode command

---

description: Full deployment agent: build subtask: true

---

Run /test first, then deploy $ARGUMENTS to production.
```

#### Cursor

- **Chaining supported**: Can chain commands via `@command.md` file references
- **Sequential in same window**: Running commands in same chat window maintains
  context
- **File references**: Use `@` to reference other command files

### 7.4 Execution Context and Isolation

| Agent           | Isolated Context   | Context Sharing         | State Persistence |
| --------------- | ------------------ | ----------------------- | ----------------- |
| **Claude Code** | ✅ `context: fork` | Main context by default | Session-based     |
| **Windsurf**    | ❌ No isolation    | Shared workflow context | Session-based     |
| **OpenCode**    | ✅ `subtask: true` | Main context by default | Session-based     |
| **Cursor**      | ❌ No isolation    | Shared chat context     | Session-based     |

### 7.5 Dynamic Content Injection

| Feature              | Claude Code               | Windsurf                  | OpenCode                 | Cursor         |
| -------------------- | ------------------------- | ------------------------- | ------------------------ | -------------- |
| **Shell output**     | ✅ `!\`command\``         | ❌ No                     | ✅ `!\`command\``        | ❌ No          |
| **File content**     | ✅ Skill supporting files | ✅ Skill supporting files | ✅ `@filename`           | ✅ `@filename` |
| **Git context**      | Via shell commands        | Via shell commands        | Via shell commands       | Via `@git`     |
| **Environment vars** | Via shell commands        | Via shell commands        | Via config interpolation | ❌ No          |

### 7.6 Key Behavioral Differences

#### Position Sensitivity

**Most agents pass the full user prompt to the command**, so position doesn't
affect functionality:

```
# Claude Code, Windsurf, Cursor - Full message passed to command
✅ /deploy staging              # Command invoked with "staging" as context
✅ Please /deploy staging       # Also works! Full message is context
✅ /deep-research /deep-docs    # Both commands receive full message

# OpenCode - Position matters more
✅ /deploy staging              # Command invoked, "staging" → $ARGUMENTS
⚠️ Please /deploy staging       # May not trigger command detection
```

**Key insight**: When you type `/cmd1 /cmd2 some context`, the agent:

1. Detects the first command (`/cmd1`)
2. Passes the **entire message** (including `/cmd2 some context`) as input
3. The command body can then reference `/cmd2` as instructions

#### Argument Consumption

- **Claude/OpenCode**: Everything after the command name becomes `$ARGUMENTS`
- **Windsurf**: No argument passing; use workflow steps instead
- **Cursor**: Use `@file` mentions to pass context

#### Chaining Mechanisms

- **Claude Code**: Uses `SlashCommand` tool for programmatic chaining - Claude
  can invoke multiple commands sequentially
- **Windsurf**: Uses "Call /workflow-name" syntax in workflow body
- **OpenCode/Cursor**: Chain via body instructions (less structured)
- **No inline syntax**: No agent supports raw `/cmd1 /cmd2` syntax in a single
  user message
- **Sequential only**: No parallel command execution supported

### 7.7 Conversion Implications for Chaining

| From → To           | Chaining Conversion Strategy                                            |
| ------------------- | ----------------------------------------------------------------------- |
| Claude → Windsurf   | Convert skill body instructions to workflow steps with "Call /workflow" |
| Claude → OpenCode   | Direct mapping; both use body instructions for chaining                 |
| Windsurf → Claude   | Convert "Call /workflow" to skill body instructions                     |
| Windsurf → OpenCode | Convert workflow steps to command body; may lose step structure         |
| OpenCode → Claude   | Direct mapping; OpenCode reads `.claude/skills/` natively               |
| Cursor → Others     | Infer chaining from `@command.md` references                            |

---

## 8. Hooks and Plugins Deep Dive (January 2026 Update)

This section provides updated research on hook and plugin capabilities as of
January 2026.

### 8.1 Cursor Hooks (v1.7+)

**Available Hook Types:**

| Hook                 | Input                   | Output         | Modification?       |
| -------------------- | ----------------------- | -------------- | ------------------- |
| `afterAgentResponse` | `{ text: "..." }`       | `{}` (ignored) | ❌ Observation only |
| `afterAgentThought`  | `{ text, duration_ms }` | `{}` (ignored) | ❌ Observation only |
| `beforeSubmitPrompt` | User message data       | Partial        | ⚠️ Limited          |
| `preToolUse`         | Tool details            | Can modify     | ✅ Yes              |
| `postToolUse`        | Tool result             | Can modify     | ✅ Yes              |

**Critical Limitations:**

- Response hooks (`afterAgentResponse`, `afterAgentThought`) are
  observation-only
- No session lifecycle hooks (`sessionStart`, `sessionEnd`)
- No mechanism to inject context at session start
- Cannot modify agent's internal state from hooks

**Implication:** Full-mode Response Boxes (automatic injection) NOT possible in
Cursor.

### 8.2 Windsurf Hooks (v1.12.41+, Wave 13)

**Available Hook Types:**

| Hook                    | Input Data         | Can Block? | Can Return Context? |
| ----------------------- | ------------------ | ---------- | ------------------- |
| `pre_user_prompt`       | User prompt        | ✅ Exit 2  | ❌ No               |
| `post_user_prompt`      | User prompt        | ❌ No      | ❌ No               |
| `pre_read_code`         | File path          | ✅ Exit 2  | ❌ No               |
| `post_read_code`        | File content       | ❌ No      | ❌ No               |
| `pre_write_code`        | File path, content | ✅ Exit 2  | ❌ No               |
| `post_write_code`       | File path, result  | ❌ No      | ❌ No               |
| `pre_run_command`       | Command            | ✅ Exit 2  | ❌ No               |
| `post_run_command`      | Command, output    | ❌ No      | ❌ No               |
| `pre_mcp_tool_use`      | Tool details       | ✅ Exit 2  | ❌ No               |
| `post_mcp_tool_use`     | Tool result        | ❌ No      | ❌ No               |
| `post_cascade_response` | Full trajectory    | ❌ No      | ❌ No               |
| `post_setup_worktree`   | Worktree info      | ❌ No      | ❌ No               |

**Critical Limitations:**

- Hooks cannot return `additional_context` for injection
- Pre-hooks can only block (exit code 2), not modify
- Memories are NOT programmatically accessible
- No session lifecycle hooks

**Implication:** Enhanced-mode Response Boxes possible (collection automatic,
injection via workflow).

### 8.3 OpenCode Plugins (v1.1.34+, January 2026)

**Available Plugin Hooks:**

| Hook                                 | Purpose                    | Stability             |
| ------------------------------------ | -------------------------- | --------------------- |
| `message.updated`                    | Real-time message tracking | Stable                |
| `message.removed`                    | Message deletion tracking  | Stable                |
| `message.part.updated`               | Message part tracking      | Stable                |
| `session.created`                    | Session lifecycle          | Stable                |
| `session.deleted`                    | Session lifecycle          | Stable                |
| `session.idle`                       | Idle detection             | Stable                |
| `tool.execute.before`                | Pre-tool hook              | Stable                |
| `tool.execute.after`                 | Post-tool hook             | Stable                |
| `experimental.chat.system.transform` | System prompt injection    | Experimental          |
| `chat.headers`                       | HTTP header modification   | Stable (New Jan 2026) |
| `experimental.session.compacting`    | Session state preservation | Experimental          |

**Key Updates (January 2026):**

- `chat.system.transform` now includes `sessionID` parameter
- `chat.headers` graduated to stable
- `unstable_setSessionModel` renamed to indicate transitional status

**Implication:** Full-mode Response Boxes fully supported via plugin.

### 8.4 Hook Event Mapping Matrix

| Capability            | Claude Code            | OpenCode                 | Windsurf                   | Cursor                  |
| --------------------- | ---------------------- | ------------------------ | -------------------------- | ----------------------- |
| **Session Start**     | ✅ `SessionStart`      | ✅ `session.created`     | ❌ None                    | ❌ None                 |
| **Session End**       | ✅ `SessionEnd`        | ✅ `session.deleted`     | ❌ None                    | ❌ None                 |
| **Response Capture**  | ⚠️ Transcript          | ✅ `message.updated`     | ✅ `post_cascade_response` | ✅ `afterAgentResponse` |
| **Context Injection** | ✅ `additionalContext` | ✅ `system.transform`    | ❌ None                    | ❌ None                 |
| **Pre-Tool Hook**     | ✅ `PreToolUse`        | ✅ `tool.execute.before` | ✅ `pre_*` hooks           | ✅ `preToolUse`         |
| **Post-Tool Hook**    | ✅ `PostToolUse`       | ✅ `tool.execute.after`  | ✅ `post_*` hooks          | ✅ `postToolUse`        |
| **Blocking**          | ✅ Exit code 2         | ❌ No                    | ✅ Exit code 2             | ✅ Exit code 2          |
| **Response Modify**   | ❌ No                  | ❌ No                    | ❌ No                      | ❌ No                   |

### 8.5 Cross-Agent Learning Capability

| Feature                    | Claude Code  | OpenCode     | Windsurf    | Cursor      |
| -------------------------- | ------------ | ------------ | ----------- | ----------- |
| **Automatic Collection**   | ✅ Full      | ✅ Full      | ✅ Full     | ✅ Full     |
| **Automatic Injection**    | ✅ Full      | ✅ Full      | ❌ Workflow | ❌ Manual   |
| **Shared Event Store**     | ✅           | ✅           | ✅          | ✅          |
| **Cross-Session Learning** | ✅ Full loop | ✅ Full loop | ⚠️ Partial  | ⚠️ Partial  |
| **Analysis Skill**         | ✅ Native    | ⚠️ Fallback  | ⚠️ Fallback | ⚠️ Fallback |

---

## 9. Related Projects

### 9.1 Response Boxes

A metacognitive annotation system that uses CACE for cross-agent component
conversion.

**Repository:** `../agent-response-boxes`

**Key Files:**

- `docs/cross-agent-compatibility.md` - Compatibility guide
- `PLAN-v0.5.0.md` - Implementation roadmap
- `agents/*/` - Per-agent implementations

See:
[Response Boxes Integration Guide](../integration/response-boxes-integration.md)

---

_Research updated January 24, 2026_
