# Agent Artifact Compatibility Matrix (Current Audit)

**As of:** April 11, 2026  
**Intent:** distinguish vendor-verified surfaces from CACE heuristics and unsupported assumptions

## How To Read This

- `Verified`: directly supported by current official vendor docs reviewed in this audit.
- `Heuristic`: CACE has an internal mapping or parser/renderer, but current vendor-native parity is weaker or incomplete.
- `Historical`: older repo knowledge that may still help conversions, but should not be treated as current truth without re-checking.

## 1. Current High-Confidence Surfaces

| Agent | Verified instruction/context surfaces | Verified reusable artifact surfaces | Verified execution/governance surfaces | Confidence |
| --- | --- | --- | --- | --- |
| Claude Code | `CLAUDE.md`, rules, hooks docs, subagents docs | skills, commands | hooks, tool controls, delegated execution | High |
| Windsurf | `AGENTS.md`, rules, memories docs | workflows | MCP, rules engine, workflow automation | Medium-High |
| Cursor | rules (`.mdc`) are clearly documented | commands/rules are well-established | hooks documented, but current skill/subagent claims need tighter re-check | Medium |
| OpenCode | repo currently models it strongly, but this audit did not fully re-verify official docs end-to-end | skills/commands/agents likely strong | permissions/plugins likely strong | Medium |
| Codex | `AGENTS.md` guidance, config, profiles | skills in `.agents/skills/<name>/SKILL.md` | approvals, sandboxing, MCP, model/provider config | High |
| Gemini CLI | `GEMINI.md`, settings, trusted folders, multi-directory context | custom commands are documented | built-in tools, MCP, security/sandboxing, git worktrees | High |

## 2. CACE Support Posture

| Agent | Memory / instructions | Skills / workflows | Commands | Hooks / lifecycle | Recommended CACE posture |
| --- | --- | --- | --- | --- | --- |
| Claude Code | Native | Native | Native | Native | Canonical rich source format |
| Windsurf | Native | Native for workflows, mixed for skills parity | Workflow-based | Native hooks support in repo | Strong target with dual-lane modeling |
| Cursor | Native for rules / universal memory patterns | Mixed and version-sensitive | Native | Native | Keep version-aware and cautious |
| OpenCode | Native enough for current repo model | Native | Native | Plugin/event model differs | Good target, but refresh docs before increasing confidence |
| Codex | Native for `AGENTS.md` and skills | Native for skills; other artifact types more cautious | Heuristic / mixed confidence | No native hook parity | Treat as first-class skill + guidance target |
| Gemini CLI | Native for `GEMINI.md`-style context | Heuristic in current CACE model | Heuristic unless mapped to current custom command docs | No hook parity | Treat as strong context target, cautious artifact target |

## 3. Most Important Cross-Agent Truths

### 3.1 Universal instructions are converging, runtime semantics are not

`AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are increasingly useful as the portable layer for:

- durable project instructions
- nested / inherited guidance
- repository-scoped behavior

They are **not** enough to preserve:

- hook semantics
- approval models
- tool allowlists
- sandbox models
- subagent orchestration

### 3.2 Codex is no longer the “no native skills” outlier

Current official Codex docs clearly support native skills. The current CACE model should therefore assume:

- `Claude skill -> Codex skill` is a real first-class path
- major losses are about isolation and governance, not absence of a skill system

### 3.3 Gemini is stronger on context than older repo docs suggested

Current official Gemini CLI docs are much stronger on:

- hierarchical context
- custom commands
- built-in execution/search tools
- MCP
- trusted-folder execution policy

But that does **not** automatically validate every markdown-frontmatter artifact shape that CACE currently models.

## 4. Loss Model That CACE Should Prefer

| Source feature | Portable? | Best target handling |
| --- | --- | --- |
| Static instructions | Usually yes | Convert to `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` depending on target |
| Invocation phrasing | Often partial | Map to skill/workflow/command where documented |
| File-pattern activation | Partial | Translate to target globs/rules when available |
| Tool restrictions | Rarely portable | Emit warnings, body guidance, and policy notes |
| Forked / isolated execution | Rarely portable | Emit critical loss with workaround guidance |
| Hooks / lifecycle automation | Sometimes partial | Translate only where target hook/event model is explicitly documented |
| Subagents / delegated execution | Rarely portable | Preserve as narrative guidance unless target docs confirm native support |

## 5. Canonical Sources For Current Work

- Repo audit: [`docs/research/repo-audit-2026-04-11.md`](./repo-audit-2026-04-11.md)
- Parity reasoning: [`docs/AGENT_PARITY_KNOWLEDGE.md`](../AGENT_PARITY_KNOWLEDGE.md)
- Evolution over time: [`docs/research/compatibility-evolution-timeline.md`](./compatibility-evolution-timeline.md)

## 6. Primary External Sources

- OpenAI Codex repo: https://github.com/openai/codex
- OpenAI Codex skills docs: https://developers.openai.com/codex/skills
- OpenAI Codex config docs: https://developers.openai.com/codex/config-reference
- Gemini CLI repo: https://github.com/google-gemini/gemini-cli
- Gemini CLI docs: https://geminicli.com/docs/cli/custom-commands/
- Gemini CLI git worktrees: https://geminicli.com/docs/cli/git-worktrees/
- Windsurf AGENTS docs: https://docs.windsurf.com/windsurf/cascade/agents-md
- Windsurf docs home: https://docs.windsurf.com/
- Claude Code hooks: https://docs.anthropic.com/en/docs/claude-code/hooks-guide
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
