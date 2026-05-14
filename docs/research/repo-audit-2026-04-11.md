# Repository Audit: Cross-Agent Compatibility Truthfulness

**Audit date:** April 11, 2026  
**Scope:** repository mission, current compatibility claims, implementation confidence, and documentation drift  
**Goal:** make CACE a defensible compatibility engine instead of a confidence engine

## Mission

CACE should act as three things at once:

1. A canonical intermediate representation for agent scaffolding and instruction artifacts.
2. A compatibility knowledge base that distinguishes native support, approximations, and unsupported behaviors.
3. A conversion tool that preserves intent while surfacing loss, risk, and required operator workarounds.

The repository is strongest when it treats compatibility as **behavior + policy + discovery semantics**, not just file syntax.

## High-Severity Findings

### 1. Implemented support was often described as vendor-native support

The repo frequently described CACE parser/renderer coverage as if it were confirmed current vendor behavior.

- **Codex:** older docs claimed “no native skills,” but current official docs describe native skills in `.agents/skills/<name>/SKILL.md` and explicit/implicit skill invocation.
- **Gemini CLI:** older docs described Gemini as essentially a flat `GEMINI.md` target with little artifact structure, but current official docs describe hierarchical context, custom commands, MCP, trusted folders, built-in tools, and git worktrees.

Impact:
- misleading fidelity scores
- misleading conversion guarantees
- false confidence in “native” round-trips

### 2. Several docs used synthetic compatibility phases as if they were vendor versions

`src/versioning/version-catalog.ts` uses useful internal epochs for compatibility reasoning, but the repo sometimes reads like those are official vendor semver streams. That is especially risky for Codex, whose current public release train is still `0.x`.

Impact:
- incorrect migration expectations
- confusing source attribution
- brittle “latest/current” reasoning

### 3. Gemini support in code is more speculative than the repo admitted

The code currently models Gemini markdown skills and markdown commands with YAML frontmatter, while the current official Gemini CLI surface is much more clearly documented around:

- `GEMINI.md` context files
- custom commands
- `settings.json`
- trusted folders / execution policy
- MCP integration
- built-in tools

Impact:
- parser and renderer behavior may be useful as an internal compatibility approximation
- but it should not be presented as fully verified vendor-native artifact parity

## Medium-Severity Findings

### 4. Codex command/rule support is less certain than Codex skill and AGENTS support

Current official evidence strongly supports:

- `AGENTS.md` guidance layering
- skills
- config in `~/.codex/config.toml`
- approvals, sandboxing, MCP, profiles

The repo also models Codex custom commands and rules as native markdown artifacts. That may remain useful for CACE, but it is less clearly verified than skills/config/guidance.

### 5. Legacy docs conflict with each other

Examples:

- README markets current support broadly.
- `docs/AGENT_PARITY_KNOWLEDGE.md` contains sharper parity analysis but still includes outdated Codex and Gemini claims.
- `docs/COMPATIBILITY_GAP_REPORT.md` contains now-stale conclusions but looked canonical.

Impact:
- users cannot tell which document is authoritative

### 6. Fidelity numbers were often presented without confidence labels

For a repo like this, a single percentage without provenance is not enough. A better model is:

- `verified`
- `heuristic`
- `legacy`
- `unsupported`

## Verified Current Vendor Facts

These were the most relevant official facts confirmed during this audit.

### OpenAI Codex

- The public Codex repo shows the project is active and the latest release was `0.120.0` on **April 11, 2026**.
- Official Codex skills docs state that skills are directories with `SKILL.md`, optional `scripts/`, `references/`, `assets/`, and optional `agents/openai.yaml`.
- Official Codex skills docs state Codex scans `.agents/skills` from the current working directory upward to the repository root.
- Official Codex config docs document `~/.codex/config.toml`, MCP server settings, profiles, model selection, approvals, and sandboxing.

Sources:
- https://github.com/openai/codex
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/config-reference

### Gemini CLI

- The official Gemini CLI repo documents built-in tools, MCP support, `GEMINI.md`, multi-directory usage, and current release cadence.
- The latest GitHub release visible during this audit was `v0.37.1` on **April 9, 2026**.
- Official docs expose custom commands, sandbox/security, trusted folders, MCP integration, and git worktrees as first-class surfaces.

Sources:
- https://github.com/google-gemini/gemini-cli
- https://geminicli.com/docs/cli/custom-commands/
- https://geminicli.com/docs/cli/git-worktrees/

### Windsurf

- Official Windsurf docs currently document `AGENTS.md` support and describe it as feeding the same rules engine that powers `.windsurf/rules/`.
- Current official docs also expose Workflows, MCP, Memories, and Rules as active surfaces.

Sources:
- https://docs.windsurf.com/windsurf/cascade/agents-md
- https://docs.windsurf.com/

### Claude Code

- Current official docs confirm hooks and subagent lifecycle events remain central to Claude Code compatibility.

Sources:
- https://docs.anthropic.com/en/docs/claude-code/hooks-guide
- https://code.claude.com/docs/en/sub-agents

## What Changed In This Audit Pass

1. Marked the main README with a canonical-current research pointer.
2. Replaced the artifact compatibility matrix with a more explicit verified-vs-heuristic view.
3. Updated parity docs so Codex is treated as a native skills target, not a “no native skills” exception.
4. Downgraded speculative artifact support levels in code where current vendor evidence is weaker.
5. Added status notices to legacy reports so they stop acting like current truth.

## Residual Risks

1. Cursor current skill/subagent support still needs a focused official-doc pass.
2. OpenCode is likely more compatible than many agents, but its exact current precedence and artifact surface should be re-verified directly from current official docs before raising confidence further.
3. Gemini markdown skill parity remains heuristic until backed by current official artifact docs, not just repo conventions.

## Recommended Next Steps

1. Introduce confidence metadata directly into `ComponentSpec` conversion reports.
2. Separate `vendor_native`, `vendor_documented_approximation`, and `cace_internal_format` in the support model.
3. Add vendor-doc-backed fixture tests for every “native” artifact type.
4. Split “compatibility epochs” from “vendor versions” in the version catalog UI and docs.
