# Agent Parity Knowledge

**Document Version:** 1.2.0  
**Created:** 2026-01-30  
**Updated:** 2026-03-13  
**Purpose:** Comprehensive analysis of conversion parity issues across AI coding agents

> **Status note (May 14, 2026):** this document remains useful for parity
> reasoning, but the **canonical evidence layer** is now
> [`docs/research/repo-audit-2026-05-14.md`](./research/repo-audit-2026-05-14.md).
> The May 14 audit verified every catalog claim against current vendor docs
> and led to: deleting three fabricated breaking changes, fixing Codex user
> path (`~/.codex/skills` → `~/.agents/skills`), reframing Codex versions
> as compatibility epochs tracking concrete vendor versions, expanding
> Windsurf hook coverage (2 → 12 events), adding AGENTS.md as a universal
> memory artifact across Cursor/Windsurf/Codex/Gemini, promoting
> `claude.memory.render` and `claude.rule.render` to native, and bumping
> current versions to Cursor 3.3, Gemini 0.42, OpenCode 1.14.50, Claude
> 2.1.141, and Codex epoch 1.2 (vendor 0.130.0). The earlier
> [`repo-audit-2026-04-11.md`](./research/repo-audit-2026-04-11.md) remains
> in-tree for historical context.

This document focuses on the current parity gaps and conversion consequences. For
the historical evolution of compatibility over time, including when the major
turning points occurred across Claude Code, Windsurf, Cursor, Codex, OpenCode,
Gemini CLI, and the `AGENTS.md` ecosystem, see
`docs/research/compatibility-evolution-timeline.md`.

---

## Executive Summary

This document captures research findings on conversion parity gaps between Claude Code and other AI coding agents. Understanding these gaps is essential for the CACE dual-output strategy and proper user guidance.

Fidelity figures below are calibrated to the May 14, 2026 audit. Every
percentage is sensitive to the silent feature drops the audit identified
(plugins, path-triggered skills, 29 Claude hook events, 12 Windsurf hook
events, Codex `requirements.toml`, Gemini Trusted Folders, OpenCode
permission tri-state). Treat as directional, not absolute.

| Source → Target | Fidelity | Critical Gaps | Strategy |
|-----------------|----------|---------------|----------|
| Claude → Windsurf | ~75% | Plugins, 27 of 29 hook events, dynamic `!`-injection, fork-context | Map SKILL.md + 2 hook events; flag rest as lossy |
| Claude → Cursor | ~80% | Plugins, path-triggered skills, allowed-tools (hard boundary), fork-context | Map SKILL.md + .mdc rules; flag plugins as Cursor 2.5 marketplace install |
| Claude → OpenCode | ~95% | Plugins, permission tri-state translation | Near-native; preserve AGENTS.md |
| Claude → Codex | ~80% | Plugins, hooks, `requirements.toml`, fork-context | Native skill + AGENTS.md; translate hooks to N/A |
| Claude → Gemini | ~70% | Plugins, hooks, fork-context, settings.json wiring, Trusted Folders | GEMINI.md + .gemini/skills approximation |

---

## 1. Claude allowed-tools vs Windsurf Tool Restrictions

### Claude Model

Claude Code's `allowed-tools` field provides **hard security boundaries**:

```yaml
---
name: security-audit
description: Audit codebase for security vulnerabilities
allowed-tools: ["Read", "Grep"]  # Read-only analysis
context: fork  # Isolated execution
---

Analyze the codebase for vulnerabilities. DO NOT modify any files.
```

**Security Properties:**
- ✅ Agent CANNOT use tools not in the list
- ✅ Prevents accidental code modification
- ✅ Read-only operations enforced at runtime
- ✅ Critical for audit/compliance workflows

### Windsurf Model

Windsurf has **NO equivalent** to tool restrictions:

| Capability | Claude | Windsurf |
|------------|--------|----------|
| Tool whitelist | ✅ `allowed-tools` | ❌ No equivalent |
| Tool blacklist | ✅ `restricted-tools` | ❌ No equivalent |
| Execution sandbox | ✅ `context: fork` | ❌ No equivalent |

### Conversion Impact

**Severity: CRITICAL (Security)**

When converting a Claude skill with tool restrictions to Windsurf:

```yaml
# Claude Original
allowed-tools: ["Read", "Grep"]  # Cannot use Write, Edit, Bash

# Converted to Windsurf (NO enforcement)
---
description: Security audit skill
---

Analyze code for vulnerabilities.
# ❌ No mechanism to prevent Write/Edit/Bash!
```

**Risk**: A "safe" read-only audit skill can accidentally modify production code in Windsurf.

### Workarounds

1. **Documentation-only approach**: Add explicit warnings in body
   ```markdown
   ⚠️ READ-ONLY OPERATION ⚠️
   You are RESTRICTED to Read and Grep tools only.
   DO NOT use Write, Edit, or Bash tools.
   ```

2. **Separate safety skill**: Create a companion skill that reviews modifications

3. **User education**: Warn users about the security boundary loss

---

## 2. Claude fork context vs Windsurf Isolation

### Claude Model

Claude's `context: fork` creates isolated execution environments:

```yaml
---
name: deep-explore
description: Comprehensive codebase exploration
context: fork  # Isolated execution
agent: explore  # Sub-agent delegation
---

Explore the codebase and create an architecture overview.
```

**Isolation Properties:**
- New conversation context (no history pollution)
- Independent context window
- No side effects on main conversation
- Sub-agents get fresh context

### Windsurf Model

Windsurf has **NO equivalent** to context forking:

| Feature | Claude | Windsurf |
|---------|--------|----------|
| Context isolation | ✅ `context: fork` | ❌ No equivalent |
| Sub-agent delegation | ✅ `agent:` | ❌ No equivalent |
| Fresh context window | ✅ Fork creates new | ❌ No equivalent |

### Conversion Impact

**Severity: CRITICAL (Behavioral)**

When converting a fork-context skill to Windsurf:

```yaml
# Claude Original
context: fork  # Isolated execution for large codebase analysis

# Converted to Windsurf (NO isolation)
---
description: Comprehensive codebase exploration
---

Explore the codebase...
# ❌ Runs in main context - conversation history polluted
# ❌ No sub-agent support
```

**Risks:**
- Context window overflow for large codebases
- Conversation history pollution
- Unintended side effects
- Performance degradation

### Workarounds

1. **Manual context clearing**: Add instructions to run `/clear` first
   ```markdown
   ⚠️ CONTEXT MANAGEMENT REQUIRED ⚠️
   Before running: Type /clear to reset conversation context.
   This ensures isolated execution for large codebase analysis.
   ```

2. **Chunked processing**: Break large tasks into smaller chunks

3. **Session management**: Recommend starting fresh session for large tasks

---

## 3. Cursor Hooks + Skills vs Claude Hooks + Skills

### Claude Hooks System

Claude Code's hooks system (introduced July 2025) enables event-driven automation through
`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint"
          }
        ]
      }
    ]
  }
}
```

**Hook Events Available:**
- `PreToolUse` - Before tool execution
- `PostToolUse` - After tool execution
- `UserPromptSubmit` - Before the user prompt is submitted
- `SessionStart` - New session begins
- `SessionEnd` - Session ends
- `Stop` / `TaskCompleted` - Execution stops or the task completes
- `SubagentStart` / `SubagentStop` - Sub-agent lifecycle

### Cursor Hooks (and Claude compatibility)

Cursor supports an event-driven hooks system and can load **Claude Code hooks** for compatibility.

- **Native Cursor hooks**: `.cursor/hooks.json`
- **Claude compatibility hooks** (if enabled): `.claude/settings.json` / `.claude/settings.local.json` / `~/.claude/settings.json`

Cursor maps Claude hook event names to Cursor equivalents and supports **exit code 2 blocking**.

This means that **Claude hooks → Cursor hooks is no longer “documentation-only”**; a large subset is directly portable.

### Cursor .mdc Rules (still useful)

Cursor uses `.mdc` files with `alwaysApply` for rule activation:

```yaml
---
description: Code style enforcement
globs: ["src/**/*.ts"]
alwaysApply: false
---

# Code Style

Follow these rules when editing TypeScript files:
1. Use explicit return types
2. No 'any' type
3. Use const over let
```

**Activation Modes:**
- `alwaysApply: true` - Applied to every AI interaction (global)
- `alwaysApply: false` - Model decides when to apply

### Parity Analysis (Hooks)

| Feature | Claude Hooks | Cursor Hooks |
|---------|--------------|-------------|
| Event triggers | ✅ Rich events | ✅ Rich events |
| Pre-execution | ✅ `PreToolUse` | ✅ `preToolUse` |
| Post-execution | ✅ `PostToolUse` | ✅ `postToolUse` |
| Prompt hooks | ✅ `UserPromptSubmit` | ✅ `beforeSubmitPrompt` |
| Response observation | ❌ No native response hook | ✅ `afterAgentResponse`, `afterAgentThought` |
| Session lifecycle | ✅ `SessionStart`, `SessionEnd` | ❌ No session lifecycle hooks |
| Pattern matching | ✅ Matchers | ✅ Matchers (mapped) |
| Command execution | ✅ Shell commands | ✅ Shell commands |
| Blocking | ✅ exit code 2 | ✅ exit code 2 |

### Key Differences

1. **Settings vs native hooks** - Claude hook definitions live in `settings.json`; Cursor can load Claude-compatible settings or use native `.cursor/hooks.json`
2. **Session lifecycle gap** - Claude has `SessionStart` and `SessionEnd`; Cursor does not expose equivalent session lifecycle hooks
3. **Response hooks are Cursor-only** - Cursor adds `afterAgentResponse` and `afterAgentThought`, but they are observation-only
4. **Tool mapping** - Some Claude tool names do not exist in Cursor, so matcher portability is not perfect
5. **Rules vs hooks** - `.mdc` rules remain passive; use hooks for enforcement and automation

### Conversion Strategy

Claude hooks → Cursor hooks (preferred), Cursor rules (fallback):
```json
// Claude settings.json hook
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint"
          }
        ]
      }
    ]
  }
}

// Cursor hook (preferred)
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      { "matcher": "Write", "command": "npm run lint" }
    ]
  }
}
```

Cursor rule fallback:

```yaml
---
description: Run linting before committing
globs: ["src/**/*.ts"]
---

Before making any code changes, run 'npm run lint' to ensure code quality.
```

**Losses to document**:
- Session lifecycle hooks do not carry over to Cursor
- Cursor-native response hooks have no Claude equivalent
- Rules remain documentation-only when used as a fallback instead of hooks

---

## 4. OpenCode Permission Patterns

### Claude allowed-tools

Claude's tool restrictions are **hard runtime enforcement**:

```yaml
allowed-tools: ["Read", "Grep", "Bash"]
# Agent CANNOT use Edit, Write, or any other tool
```

### OpenCode Permissions

OpenCode uses a **configuration-based permission system** in `opencode.json`:

```json
{
  "permission": {
    "*": "ask",
    "bash": "allow",
    "edit": "deny"
  }
}
```

**Permission Values:**
- `"allow"` - Execute without approval
- `"ask"` - Prompt for approval
- `"deny"` - Block execution

### Parity Analysis

| Feature | Claude | OpenCode |
|---------|--------|----------|
| Tool control | ✅ Hard enforcement | ✅ Configurable |
| Per-tool granularity | ✅ `allowed-tools` | ✅ Object syntax |
| Default behavior | ❌ No default | ✅ `*` fallback |
| Runtime prompts | ❌ No prompts | ✅ `"ask"` mode |
| Subtask isolation | ⚠️ `context: fork` | ✅ `subtask: true` |

### Similarity

OpenCode provides **closest approximation** to Claude's security model:
- Both support per-tool configuration
- Both can restrict dangerous operations
- Both support isolation patterns

### Differences

1. **Claude**: Runtime enforcement, no prompts
2. **OpenCode**: Configuration-based, supports approval prompts
3. **Claude**: `allowed-tools` whitelist
4. **OpenCode**: `permission` object with allow/ask/deny

### Conversion Mapping

```yaml
# Claude
allowed-tools: ["Read", "Grep"]
context: fork

# OpenCode (approximation)
# In opencode.json:
"permission": {
  "Read": "allow",
  "Grep": "allow",
  "Bash": "deny",
  "Edit": "deny"
}
# Skill body: "This runs in isolated subtask context"
```

---

## 5. The Windsurf Bifurcation Problem

### Core Issue

Claude skills have a **unified model** - they can be both:
- **Auto-invoked** (progressive disclosure based on context)
- **Manually invoked** (via `/skill-name` command)

```yaml
# Claude skill - dual-nature
---
name: deploy
description: Deploy application to production
user-invocable: true
disable-model-invocation: false  # Can auto-suggest
---

# Deployment Process

Deploy the application following these steps...
```

**Usage:**
- User types "deploy to production" → Claude auto-suggests the skill
- User types `/deploy` → Manual invocation

### Windsurf Bifurcated Model

Windsurf forces a **binary choice**:

| Component Type | Auto-Invocation | Manual /command |
|----------------|-----------------|-----------------|
| **Skill** | ✅ Yes | ❌ No |
| **Workflow** | ❌ No | ✅ Yes |

You CANNOT have both in Windsurf!

### The Dilemma

```
Claude: user-invocable: true + disable-model-invocation: false
        ↓
Windsurf: ???

Option A: Skill → Auto-invocation ✅, Manual /command ❌
Option B: Workflow → Manual /command ✅, Auto-invocation ❌
```

### Solution: Dual-Output Strategy

CACE's `--strategy=dual-output` generates BOTH artifacts:

```
.windsurf/
├── workflows/
│   └── deploy.md          # For manual /deploy invocation
└── skills/
    └── deploy/
        └── SKILL.md       # For auto-invocation
```

**Benefits:**
- ✅ Preserves auto-invocation (skill)
- ✅ Preserves manual invocation (workflow)
- ✅ Maintains Claude's dual-nature capability
- ⚠️ User must understand when to use each

---

## 6. Gemini CLI: Context-Strong, Artifact-Cautious

### Current Position

Current official Gemini CLI documentation is strongest on:

- `GEMINI.md` context layering
- custom commands
- `settings.json`
- trusted folders and sandbox/security controls
- built-in tools
- MCP integration
- git worktrees

That means CACE should treat Gemini as a **strong context and automation target**, but should be more careful about presenting markdown skill frontmatter as fully vendor-native.

### Conversion Mapping

CACE can still map Claude tool intent to Gemini capability intent:

| Claude Tool | Gemini Mapping |
|-------------|----------------|
| `Bash`, `Shell` | `code_execution: true` |
| `Search`, `WebSearch` | `google_search: true` |
| `Read`, `Edit` | `tools: ["file_read", "file_write"]` |

### Parity Analysis

| Feature | Claude | Gemini |
|---------|--------|--------|
| Tool whitelist | ✅ `allowed-tools` | ⚠️ No directly equivalent hard whitelist |
| Code execution | ✅ `Bash` tool | ✅ Built-in execution capability |
| Web access | ✅ `Search` tool | ✅ Built-in search/web capability |
| Artifact schema confidence | ✅ High | ⚠️ Mixed: context/commands/settings are clearer than markdown skill parity |

---

## 7. Feature Loss Summary Matrix

### Critical Gaps (No Equivalent)

| Feature | Claude | Windsurf | Cursor | OpenCode | Codex | Gemini |
|---------|--------|----------|--------|----------|-------|--------|
| Context fork | ✅ | ❌ | ❌ | ⚠️ subtask | ❌ | ❌ |
| Tool restrictions | ✅ allowed-tools | ❌ | ❌ | ⚠️ permissions | ⚠️ partial policy/sandbox controls | ❌ |
| Agent delegation | ✅ agent: | ❌ | ❌ | ✅ Yes | ❌ | ❌ |
| Hook execution | ✅ PreToolUse | ❌ | ✅ | ❌ | ❌ | ❌ |
| YAML frontmatter | ✅ Full | ⚠️ Partial | ✅ (Skills) | ✅ Full | ✅ Skills; other artifact types less certain | ⚠️ Heuristic in CACE, not current highest-confidence vendor surface |

### Partial Equivalents

| Feature | Claude | Target | Mapping |
|---------|--------|--------|---------|
| Isolation | `context: fork` | OpenCode | `subtask: true` |
| Tool control | `allowed-tools` | OpenCode | `permission` object |
| Auto-invocation | `disable-model-invocation` | Windsurf | Skill vs Workflow |
| Auto-invocation | `disable-model-invocation` | Cursor | Cursor Skills (native) |
| Path matching | Triggers/globs | Cursor | `globs` in .mdc |

---

## 7. Recommendations for CACE

### Immediate Actions

1. **Always document lost features** in conversion report
2. **Warn about security implications** when tool restrictions are lost
3. **Suggest workarounds** for context isolation requirements
4. **Recommend dual-output** for Claude → Windsurf conversions

### Long-Term Improvements

1. **LLM-assisted optimization** to reconstruct lost semantics
2. **Agent-specific best practices** in converted output
3. **Security linting** to warn about dangerous conversions
4. **Dual-output as default** for Claude → Windsurf (opt-out)

---

## 8. References

- [CACE Compatibility Gap Report](../COMPATIBILITY_GAP_REPORT.md)
- [Critical Gap Analysis & Resolution Loss Assessment](./critical-gap-analysis.md)
- Claude Code Documentation: https://docs.claude.com/
- Windsurf Documentation: https://docs.windsurf.com/
- Cursor Documentation: https://cursor.com/docs
- OpenCode Documentation: https://opencode.ai/docs/

---

*Document generated by CACE v2.5.0*
