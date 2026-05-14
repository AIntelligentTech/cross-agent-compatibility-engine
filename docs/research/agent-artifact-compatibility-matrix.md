# Agent Artifact Compatibility Matrix (Current Audit)

**As of:** May 14, 2026
**Intent:** distinguish vendor-verified surfaces from CACE heuristics and unsupported assumptions
**Canonical evidence:** [`repo-audit-2026-05-14.md`](./repo-audit-2026-05-14.md)

## How To Read This

- `Verified`: directly supported by current official vendor docs reviewed in the May 14, 2026 audit.
- `Heuristic`: CACE has an internal mapping or parser/renderer, but current vendor-native parity is weaker or incomplete.
- `Historical`: older repo knowledge that may still help conversions, but should not be treated as current truth without re-checking.

## 1. Current High-Confidence Surfaces (May 14, 2026)

| Agent | Verified instruction/context surfaces | Verified reusable artifact surfaces | Verified execution/governance surfaces | Latest version |
| --- | --- | --- | --- | --- |
| Claude Code | `CLAUDE.md` (+ `@import`), `.claude/rules/*.md` (paths frontmatter), `.claude/agents/*.md` | `.claude/skills/<name>/SKILL.md` with `paths:`, `effort`, `shell`, `context`, plugin `.claude-plugin/plugin.json` | 29+ hook events (PreToolUse, PostToolUse, WorktreeCreate, etc.), MCP, plugin marketplace | **2.1.141** (May 13) |
| Windsurf | `AGENTS.md` auto-discovery, `.windsurf/rules/`, Memories | `.windsurf/skills/<name>/SKILL.md` (Wave 13+), `.windsurf/workflows/*.md`, global `~/.codeium/windsurf/skills/`, enterprise paths | 12 hook events (`pre/post_read_code`, `pre/post_write_code`, `pre/post_run_command`, `pre/post_mcp_tool_use`, `pre_user_prompt`, `post_cascade_response`, `post_cascade_response_with_transcript`, `post_setup_worktree`), MCP, rules engine | wave-14 / **2.2.17** (May 6) |
| Cursor | `.cursor/rules/*.mdc` (with `description`, `globs`, `alwaysApply` frontmatter), AGENTS.md referenced | `.cursor/skills/<name>/SKILL.md` (2.4+), `.cursor/commands/*.md`, subagents (2.4+ async in 2.5+), marketplace plugins (2.5+), self-hosted agents (2.5.1 / 2026-03-25) | hooks (`.cursor/hooks.json`), sandbox.json (2.5+) network/permission controls, automations (2.5+) | **3.3** (May 7) |
| OpenCode | `AGENTS.md` (primary) + `CLAUDE.md` (fallback), `~/.claude/CLAUDE.md` global, opencode.json instructions (glob patterns, no URL sources) | `.opencode/skills/<name>/SKILL.md` + `.claude/skills/` + `.agents/skills/`, `.opencode/agents/<name>.md` with `mode: subagent` frontmatter, `.opencode/commands/<name>.md` | tri-state permission model (allow/deny/ask, glob-keyed), MCP servers, plugin event hooks (`tui.*`, session compaction), GitLab integration | **1.14.50** (today) |
| Codex | `AGENTS.md` + `AGENTS.override.md` chain (with `project_doc_fallback_filenames` aliases like `TEAM_GUIDE.md`), `~/.codex/AGENTS.override.md` | `.agents/skills/<name>/SKILL.md` (project) + `~/.agents/skills/` (user), `.codex/agents/*.toml` + `~/.codex/agents/*.toml` subagents (built-in `default`/`worker`/`explorer`) | `approval_policy` (untrusted/on-request/never/granular), `sandbox_mode` (read-only/workspace-write/danger-full-access), `requirements.toml` admin governance, MCP, plugin marketplace (0.128+) | Epoch **1.2** / vendor **0.130.0** (May 8) |
| Gemini CLI | `GEMINI.md` + `~/.gemini/GEMINI.md` global, `context.fileName` alias accepts AGENTS.md / CONTEXT.md, hierarchical JIT context to trusted-folder root | `.gemini/skills/<name>/SKILL.md` + `.agents/skills/` alias, `.gemini/agents/<name>.md` (YAML: `name`, `description`, `kind`, `tools`, `model`, `temperature`, `max_turns`), `.gemini/commands/*.toml` custom commands (separate from skills), built-in `codebase_investigator`/`cli_help`/`generalist`/`browser_agent` | `~/.gemini/settings.json` (security, experimental, context, mcpServers), Trusted Folders (`~/.gemini/trustedFolders.json`), policy directory `~/.gemini/policies/*.toml` (NOT a single `policy.toml`), sandboxing (macOS Seatbelt, Windows icacls, Linux gVisor/Docker/Podman/LXC), per-subagent inline MCP | **0.42.0** (May 12); nightly **0.44.0** today |

## 2. CACE Support Posture (post-May 14 audit)

| Agent | Memory / AGENTS.md | Skills | Commands | Rules | Hooks | Subagents | CACE posture |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Code | **Native** ↗ (was render: none) | Native | Native | **Native** ↗ (was render: none) | Native (sparse — 2 of 29 events) | Native | Canonical rich source; render CLAUDE.md + rules first-class |
| Windsurf | Native (AGENTS.md auto-discovery) | **Native** ↗ (was degraded render) | Workflow-mapped | Native | Native (sparse — 2 of 12 events) | n/a | Strong target with dual-lane (skill + workflow) modeling |
| Cursor | Native (AGENTS.md) | Native | Native | **Native** ↗ (was degraded render) | Native | Native (2.4+) | Version-aware target; native rendering for `.mdc` |
| OpenCode | Native (AGENTS.md primary, CLAUDE.md fallback) | Native | Native | n/a (uses AGENTS.md) | Plugin event model | Native (`mode: subagent` validated) | Canonical near-clone of Claude; near-95% fidelity |
| Codex | Native (AGENTS.md + AGENTS.override.md) | Native | Degraded | Degraded | n/a | Degraded (TOML subagents) | Treat as first-class skill + AGENTS.md target |
| Gemini CLI | Native (GEMINI.md + AGENTS.md alias) | Degraded (heuristic) | Degraded (commands are TOML, not markdown) | n/a | n/a | Native (.gemini/agents YAML) | Strong context target, cautious artifact target |

↗ = promoted by May 14 audit.

## 3. Most Important Cross-Agent Truths

### 3.1 AGENTS.md is the universal hook

Cursor, Windsurf, Codex, Gemini, and OpenCode all support `AGENTS.md` as the universal instruction file (Gemini via `context.fileName` alias; Codex with `project_doc_fallback_filenames` to accept arbitrary filenames). Claude Code uses `CLAUDE.md` as its primary instruction file. CACE renders `AGENTS.md` natively for all six.

### 3.2 Hook coverage is the silent loss

Two of six agents have first-class lifecycle hooks: Claude Code (29+ events) and Windsurf (12 events). CACE represents a small subset for each. Cross-agent hook conversion is intrinsically lossy — and additional Windsurf events ship as Windsurf 2.x point releases (e.g. `post_cascade_response_with_transcript` shipped in 1.9566.9 on 2026-02-25).

### 3.3 Codex epoch model

CACE's Codex versions (1.0/1.1/1.2) are internal compatibility epochs, not vendor releases. Each epoch row carries a `vendorVersion` field pinning the concrete Codex CLI minor it tracks (current: epoch 1.2 → vendor 0.130.0). The epoch model is acceptable for migration logic because Codex ships weekly minor bumps that don't all carry compatibility-affecting features.

### 3.4 Three breaking changes were fabricated

The May 14 audit verified and deleted:
- `claude-rules-location` — `.claude/rules/` is additive path-scoping, not a move from CLAUDE.md
- `cursor-cloud-agents-removed` — Cursor 3.0 added Agents Window + /worktree + /best-of-n; nothing was removed
- `windsurf-skills-location` — Agent Skills did not exist before Wave 13 (2025-12-24); no prior location to migrate from

Conversion pipelines should no longer emit migration warnings for these.

### 3.5 Gemini is "context-strong, artifact-cautious"

`GEMINI.md`, `~/.gemini/settings.json`, Trusted Folders, AGENTS.md alias, hierarchical JIT context — strongly documented. `.gemini/skills/<name>/SKILL.md` and `.gemini/agents/*.md` YAML — documented but the surrounding contract (sandbox matrix, policy directory layout, custom-command TOML) requires careful translation. CACE keeps `skill` and `command` at `degraded` for Gemini, `memory` and `agent` at `native`.

## 4. Loss Model That CACE Should Prefer

| Source feature | Portable? | Best target handling |
| --- | --- | --- |
| Static instructions | **Yes** (AGENTS.md universal) | Render `AGENTS.md` (or `CLAUDE.md` for Claude, `GEMINI.md` for Gemini global) |
| Path-triggered activation | Partial | Translate to target globs/rules when available (Cursor `globs:`, Gemini policy) |
| Skills as reusable workflows | **Yes** (5 of 6 native) | Convert to target skill location; preserve frontmatter that target understands |
| Subagents | Partial | Native for Claude / Gemini / Cursor 2.4+ / OpenCode; degraded for Codex (TOML format) |
| Tool restrictions / allowed-tools | Rarely portable | Map to target permission model (OpenCode allow/deny/ask, Gemini policy.toml) where documented; warn otherwise |
| Forked / isolated execution (`context: fork`) | Rarely portable | Emit critical loss with workaround guidance |
| Hooks / lifecycle automation | Partial | Translate Claude → Windsurf event pairs where documented; warn for the rest |
| Plugins | Rarely portable | Emit narrative guidance pointing at target's plugin marketplace |
| Approval / sandbox policy | Codex-specific | Translate to target permission model if available; otherwise narrative |
| `requirements.toml` (Codex admin governance) | Codex-specific | Narrative — describe to target's policy/permission model |

## 5. Canonical Sources For Current Work

- **Canonical audit:** [`docs/research/repo-audit-2026-05-14.md`](./repo-audit-2026-05-14.md)
- Earlier (historical): [`docs/research/repo-audit-2026-04-11.md`](./repo-audit-2026-04-11.md)
- Parity reasoning: [`docs/AGENT_PARITY_KNOWLEDGE.md`](../AGENT_PARITY_KNOWLEDGE.md)
- Evolution over time: [`docs/research/compatibility-evolution-timeline.md`](./compatibility-evolution-timeline.md)

## 6. Primary External Sources (verified 2026-05-14)

### Claude Code
- Changelog: https://code.claude.com/docs/en/changelog
- Skills: https://code.claude.com/docs/en/skills
- Sub-agents: https://code.claude.com/docs/en/sub-agents
- Hooks: https://code.claude.com/docs/en/hooks-guide / https://code.claude.com/docs/en/hooks
- Plugins: https://code.claude.com/docs/en/plugins
- Memory / CLAUDE.md: https://code.claude.com/docs/en/memory

### Cursor
- Changelog: https://cursor.com/changelog
- Cursor 3.0: https://cursor.com/changelog/3-0
- Skills: https://cursor.com/docs/skills
- Rules: https://cursor.com/docs/context/rules

### Windsurf
- Changelog: https://windsurf.com/changelog
- Skills: https://docs.windsurf.com/windsurf/cascade/skills
- Hooks: https://docs.windsurf.com/windsurf/cascade/hooks
- AGENTS.md: https://docs.windsurf.com/windsurf/cascade/agents-md
- Workflows: https://docs.windsurf.com/windsurf/cascade/workflows

### Codex
- Releases: https://github.com/openai/codex/releases
- Changelog: https://developers.openai.com/codex/changelog
- Skills: https://developers.openai.com/codex/skills
- Config: https://developers.openai.com/codex/config-reference
- AGENTS.md guide: https://developers.openai.com/codex/guides/agents-md
- Subagents: https://developers.openai.com/codex/subagents

### Gemini CLI
- Releases: https://github.com/google-gemini/gemini-cli/releases
- Skills: https://geminicli.com/docs/cli/skills/
- Subagents: https://geminicli.com/docs/core/subagents/
- Worktrees: https://geminicli.com/docs/cli/git-worktrees/
- Sandbox: https://geminicli.com/docs/cli/sandbox/
- Policy engine: https://geminicli.com/docs/reference/policy-engine/
- Trusted folders: https://geminicli.com/docs/cli/trusted-folders/
- GEMINI.md: https://geminicli.com/docs/cli/gemini-md/

### OpenCode
- Docs root: https://opencode.ai/docs/
- Rules: https://opencode.ai/docs/rules/
- Skills: https://opencode.ai/docs/skills/
- Agents: https://opencode.ai/docs/agents/
- Commands: https://opencode.ai/docs/commands/
- Config: https://opencode.ai/docs/config/
- Plugins: https://opencode.ai/docs/plugins/
- GitLab: https://opencode.ai/docs/gitlab/
- Releases: https://github.com/sst/opencode/releases
