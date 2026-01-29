# Agent-Specific Unique Features & Capabilities Matrix (v1.2.0)

**Last Updated:** January 29, 2026  
**Version:** 1.2.0  
**Purpose:** Document features that are UNIQUE to each agent and cannot be cleanly converted

---

## 🎯 Executive Summary

This document identifies features that are **unique to each agent** and **cannot be cleanly converted** to other agents. These features represent the cutting-edge capabilities that differentiate each platform.

**Key Finding:** Each agent has 8-12 unique features that are lost during conversion, representing significant semantic gaps.

---

## 🚀 OpenCode - Unique Features

### 1. Permission Pattern System (HIGHEST IMPACT)
**What:** Pattern-based permissions with `allow`/`deny`/`ask` semantics
**Syntax:**
```yaml
---
permission:
  "internal-*": "deny"
  "Read": "allow"
  "Edit": "ask"
---
```
**Impact:** CRITICAL - Security boundaries cannot be expressed in other agents
**Conversion Loss:** 100% - No equivalent in Claude/Cursor/Windsurf
**Recommendation:** Convert to explicit "DO NOT USE" instructions in body text

### 2. Multi-Agent Skill Permissions
**What:** Different skill permissions for different agents
**Example:**
```yaml
---
# For 'Explore' agent
permission:
  "Write": "deny"  # Read-only for exploration

# For 'Build' agent  
permission:
  "Write": "allow"  # Can write during build
---
```
**Impact:** HIGH - Security model loss
**Conversion Loss:** 100%
**Recommendation:** Document in skill description

### 3. Remote Configuration (.well-known/opencode)
**What:** Load configuration from organizational URLs
**Locations:**
- `.well-known/opencode` (project-level)
- `~/.opencode/.well-known/opencode` (user-level)
**Impact:** MEDIUM - Enterprise features lost
**Conversion Loss:** 100%
**Recommendation:** Inline remote configs during conversion

### 4. License & Compatibility Metadata
**What:** Optional license and compatibility fields
**Syntax:**
```yaml
---
license: "MIT"
compatibility: "opencode"
metadata:
  author: "user"
  version: "1.0.0"
---
```
**Impact:** LOW - Metadata loss
**Conversion Loss:** 100%
**Recommendation:** Add as comments in converted output

### 5. Agent Mode Declaration
**What:** Explicit `mode: primary|subagent|all` in agent configuration
**Impact:** MEDIUM - Agent behavior differences
**Conversion Loss:** 100%
**Recommendation:** Note in description field

### 6. Dual-Path Skill Loading (Claude Compatibility)
**What:** Automatically reads skills from BOTH:
- `.opencode/skills/<name>/SKILL.md`
- `.claude/skills/<name>/SKILL.md`
- `~/.claude/skills/<name>/SKILL.md`
**Impact:** HIGH - Native compatibility layer
**Conversion Benefit:** Can use Claude files directly, no conversion needed!
**Recommendation:** **DO NOT CONVERT** Claude → OpenCode, just use original

### 7. Task Tool with Subagent Spawning
**What:** Native `task()` tool with full subagent spawning
**Features:**
- Subagent resume capability
- OTEL telemetry tracking
- Parallel execution support
**Impact:** HIGH - Core functionality
**Conversion Loss:** 70% - Can approximate with instructions
**Recommendation:** Document subagent behavior in body

### 8. $TURN[n] Syntax (Conversation History)
**What:** Reference previous conversation turns
**Syntax:** `$TURN[0]`, `$TURN[-1]` (last turn)
**Impact:** MEDIUM - Context awareness
**Conversion Loss:** 100%
**Recommendation:** Remove or replace with static examples

---

## 🎭 Claude Code - Unique Features

### 1. Allowed-Tools Scoped Permissions (HIGHEST IMPACT)
**What:** Granular tool permissions with scoping
**Syntax:**
```yaml
---
allowed-tools: ["Read", "Bash(git:*)", "Edit(src/**/*.ts)"]
---
```
**Impact:** CRITICAL - Security model
**Conversion Loss:** 100% - No equivalent in other agents
**Recommendation:** Convert to explicit tool warnings in body

### 2. Context Isolation (fork)
**What:** `context: fork` runs skill in isolated subagent
**Impact:** CRITICAL - State isolation
**Conversion Loss:** 100% - No equivalent
**Recommendation:** Add warning about shared context in converted output

### 3. Agent Delegation (agent: field)
**What:** Automatic delegation to specific subagent
**Syntax:**
```yaml
---
agent: explore  # or 'plan', 'general'
---
```
**Impact:** HIGH - Execution model
**Conversion Loss:** 100%
**Recommendation:** Document as manual step in body

### 4. Disable-Model-Invocation Flag
**What:** `disable-model-invocation: true` prevents auto-invocation
**Impact:** MEDIUM - Control over skill invocation
**Conversion Loss:** 100%
**Recommendation:** Convert to manual-only workflow in Windsurf/Cursor

### 5. @import Syntax (File Inclusion)
**What:** Include other files dynamically
**Syntax:** `@path/to/file.md` or `@../shared/common.md`
**Impact:** HIGH - Modularity
**Conversion Loss:** 100% - Must inline during conversion
**Recommendation:** Resolve and inline imports during conversion

### 6. Comprehensive Hook System (10+ Events)
**What:** Pre/post tool hooks, session hooks, permission hooks
**Events:**
- `PreToolUse` / `PostToolUse`
- `UserPromptSubmit`
- `PermissionRequest`
- `SessionStart` / `SessionEnd`
- `PreCompact` / `Setup`
**Impact:** HIGH - Lifecycle control
**Conversion Loss:** 70% - Windsurf has partial equivalents
**Recommendation:** Document hooks as manual steps

### 7. Plugin Manifest System (plugin.json)
**What:** Structured plugin format with manifest
**Scopes:** `user`, `project`, `local`, `managed`
**Impact:** MEDIUM - Distribution model
**Conversion Loss:** 100%
**Recommendation:** Inline plugin config into skill frontmatter

---

## 🌊 Windsurf - Unique Features

### 1. Multi-Level Hook Configuration (HIGHEST IMPACT)
**What:** System + User + Workspace level hooks with merge behavior
**Locations:**
- System: `/etc/windsurf/hooks.json` (Enterprise)
- User: `~/.codeium/windsurf/hooks.json`
- Workspace: `.windsurf/hooks.json`
**Impact:** HIGH - Enterprise deployment
**Conversion Loss:** 100%
**Recommendation:** Flatten to single level with comments

### 2. Cascade-Specific Hook Events (11 Events)
**What:** Unique events not found in other agents
**Unique Events:**
- `pre_read_code` / `post_read_code`
- `pre_write_code` / `post_write_code`
- `pre_run_command` / `post_run_command`
- `pre_mcp_tool_use` / `post_mcp_tool_use`
- `post_cascade_response`
- `post_setup_worktree`
**Impact:** HIGH - Lifecycle coverage
**Conversion Loss:** 70% - Some overlap with Claude hooks
**Recommendation:** Map to closest equivalent or document loss

### 3. Skills vs Workflows Distinction
**What:** Two separate concepts with different capabilities
**Skills:**
- Auto-invokable via progressive disclosure
- Include supporting files/resources
- Invoked via `@skill-name`
**Workflows:**
- Manual-only invocation
- Delivery cycle automation
- YAML-based configuration
**Impact:** HIGH - Conversion routing decision required
**Conversion Strategy:**
- Claude `disable-model-invocation: true` → Windsurf Workflow
- Claude `disable-model-invocation: false` → Windsurf Skill

### 4. Auto-Execution Modes (Safety Levels)
**What:** Three levels of automation
- **Off** - Manual approval always required
- **Auto** - Automatic with safety checks
- **Turbo** - Maximum automation (admin-only)
**Impact:** MEDIUM - Safety model
**Conversion Loss:** 100%
**Recommendation:** Convert to Windsurf's auto-execution setting

### 5. System-Level Enterprise Rules
**What:** IT-enforced rules at OS level
**Locations:**
- macOS: `/Library/Application Support/Windsurf/rules.json`
- Linux: `/etc/windsurf/rules.json`
- Windows: `C:\ProgramData\Windsurf\rules.json`
**Impact:** HIGH - Enterprise governance
**Conversion Loss:** 100%
**Recommendation:** Note as enterprise feature in documentation

### 6. Cascade Memories (Auto-Generated Context)
**What:** Automatic context persistence
**Types:**
- Auto-generated memories
- User-created memories
**Impact:** MEDIUM - Context management
**Conversion Loss:** 100%
**Recommendation:** Convert to explicit context instructions

---

## 🎯 Cursor - Unique Features

### 1. .mdc File Format (Rules)
**What:** Distinct format from commands with YAML frontmatter
**Syntax:**
```yaml
---
description: "When to use this rule"
globs: ["src/**/*.ts"]
alwaysApply: false
---
```
**Impact:** HIGH - File format difference
**Conversion Loss:** 0% - We generate this format
**Benefit:** This is our PRIMARY target format

### 2. Rule Activation Modes (4 Types)
**What:** Different ways rules are applied
1. **Always Apply** - Every session (`alwaysApply: true`)
2. **Apply Intelligently** - AI decides based on description
3. **Apply to Specific Files** - Glob pattern matching
4. **Apply Manually** - @-mentioned in chat
**Impact:** HIGH - Activation semantics
**Conversion Loss:** 30% - Claude has different activation model
**Recommendation:** Set `alwaysApply` based on Claude's `disable-model-invocation`

### 3. @mention System for Context
**What:** Rich context inclusion via @ syntax
**Types:**
- `@filename.ts` - Include files
- `@Files`, `@Folders` - Context commands
- `@Code`, `@Docs`, `@Web` - Special contexts
**Impact:** HIGH - Context building
**Conversion Loss:** 100%
**Recommendation:** Convert file refs to explicit file mentions in body

### 4. Commands vs Rules Distinction
**What:** Clear separation of concerns
**Rules** (`.cursor/rules/*.mdc`): What AI *must* do (standards)
**Commands** (`.cursor/commands/*.md`): Specific repeatable steps
**Invocation:** `/command-name`
**Impact:** HIGH - Conversion decision required
**Conversion Strategy:**
- Claude Skills → Cursor Rules (if guidelines)
- Claude Skills → Cursor Commands (if procedural)

### 5. AGENTS.md Universal Format
**What:** Plain markdown, no frontmatter, nested support
**Features:**
- Combines with parent directories
- More specific overrides parent
- Simple, no frontmatter complexity
**Impact:** HIGH - Universal standard
**Conversion Loss:** 0% - We can generate this
**Benefit:** Emerging standard supported by multiple agents

### 6. Team Rules (Enterprise Enforcement)
**What:** Dashboard-managed with enforcement
**Features:**
- Sync from remote repositories
- Enforcement capability (cannot disable)
- Precedence: Team → Project → User
**Impact:** HIGH - Enterprise governance
**Conversion Loss:** 100%
**Recommendation:** Note as enterprise feature

---

## 📊 Conversion Fidelity Matrix (Updated)

| Conversion | Fidelity | Lost Features | Notes |
|------------|----------|---------------|-------|
| **Claude → OpenCode** | 98% | `allowed-tools`, `context: fork`, `agent:` | Native compatibility layer exists |
| **Claude → Cursor** | 90% | `allowed-tools`, `context: fork`, `agent:`, `@import` | Good mapping to .mdc |
| **Claude → Windsurf** | 85% | `allowed-tools`, `context: fork`, `agent:`, hooks | Skills vs Workflows decision |
| **Cursor → OpenCode** | 85% | `globs`, `alwaysApply`, `@mentions` | Rules lose activation |
| **Cursor → Claude** | 75% | `globs`, `alwaysApply`, `@mentions` | Rules become skills |
| **Windsurf → Claude** | 80% | Multi-level hooks, auto-execution | Hooks partially convertible |
| **OpenCode → Any** | 95% | Permission patterns, `license`, `compatibility` | Most features portable |

---

## 🎯 Critical Gaps Requiring LLM Optimization

### 1. Security Boundaries (CRITICAL)
**Gap:** `allowed-tools` (Claude) and Permission Patterns (OpenCode)
**Impact:** Security model lost
**LLM Optimization Strategy:**
```markdown
🔒 SECURITY NOTICE 🔒
Original skill restricted tools: ["Read", "Grep"]
In this agent, tool restrictions are not enforced.
DO NOT use: Edit, Write, Bash, Delete
Only use: Read, Grep for analysis
```

### 2. Context Isolation (CRITICAL)
**Gap:** `context: fork` (Claude)
**Impact:** State pollution risk
**LLM Optimization Strategy:**
```markdown
⚠️ ISOLATION REQUIRED ⚠️
This skill originally ran in isolated context.
In this agent, it runs in shared context.
Recommended: Clear context before running (/clear)
```

### 3. Agent Delegation (HIGH)
**Gap:** `agent:` field (Claude)
**Impact:** Execution model change
**LLM Optimization Strategy:**
```markdown
📋 DELEGATION NOTE 📓
Originally delegated to "explore" subagent.
Manual delegation required:
1. Switch to @explore agent, OR
2. Run in current context with caution
```

### 4. Multi-Level Configuration (HIGH)
**Gap:** System/User/Workspace hooks (Windsurf)
**Impact:** Enterprise deployment model
**LLM Optimization Strategy:**
Document as single-level with comments about hierarchy

---

## 📝 Implementation Recommendations

### For LLM Optimizer (--high risk mode)

1. **Detect security features**
   - Look for `allowed-tools`, permission patterns
   - Add SECURITY NOTICE section

2. **Detect isolation requirements**
   - Look for `context: fork`
   - Add ISOLATION REQUIRED warning

3. **Detect agent delegation**
   - Look for `agent:` field
   - Add DELEGATION NOTE

4. **Preserve unique metadata**
   - License, compatibility, metadata fields
   - Add as HTML comments in output

### For Non-LLM Optimization (--safe mode)

1. **Map known fields**
   - `description`, `name` - direct mapping
   - `alwaysApply` - based on `disable-model-invocation`

2. **Document losses**
   - Add comment: `<!-- Lost: allowed-tools -->`

3. **Preserve body content exactly**
   - No modifications to instructions

---

## 🔄 Version Compatibility Notes

### OpenCode
- **v1.1.0+:** Permission patterns, dual-path loading
- **v1.0.0:** Basic skills/commands

### Claude Code
- **v2.1.3+:** Unified skills/commands, `aliases` field
- **v2.1.0+:** `context: fork`, hooks
- **v2.0.0:** Basic skills system

### Windsurf
- **v1.12+ (Wave 13):** Hooks system, Cascade memories
- **v1.8+ (Wave 8):** Skills vs Workflows distinction

### Cursor
- **v0.46+:** Current .mdc format
- **v0.45+:** Deprecated .cursorrules

---

## 📚 References

- **OpenCode:** https://opencode.ai/docs
- **Claude Code:** https://docs.claude.com/en/docs/claude-code/skills
- **Windsurf:** https://docs.windsurf.com/windsurf/cascade
- **Cursor:** https://docs.cursor.com/context/rules

---

*Document Version:* 1.2.0  
*Last Updated:* January 29, 2026  
*Status:* PRODUCTION DOCUMENTATION
