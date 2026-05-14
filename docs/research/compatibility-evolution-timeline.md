# Agent Scaffolding Compatibility Evolution Timeline (2024-2026)

**Document Version:** 1.0.0  
**Updated:** 2026-03-13  
**Purpose:** Distill how compatibility across the agent scaffoldings tracked by CACE changed over time, based on public documentation, changelogs, and repository material.

> **Status note (April 11, 2026):** this document is intentionally historical. Where it references CACE version catalog entries such as `1.0`, `1.1`, or `1.2` for Codex, those are compatibility epochs used by CACE, not official vendor semver identifiers. For the current vendor-verified state, use [`repo-audit-2026-04-11.md`](./repo-audit-2026-04-11.md).

---

## Executive Summary

CACE’s compatibility problem has changed materially over time.

In early iterations, most differences were primarily about file format and directory layout. By 2025 and early 2026, the compatibility surface expanded into five harder categories:

1. **Execution model**
   - Hooks, background agents, subagents, and worktrees became first-class features.

2. **Invocation model**
   - Agents diverged between auto-invoked skills, manual slash commands, and mixed models.

3. **Instruction layering**
   - `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, rules, and overrides all developed different inheritance and precedence semantics.

4. **Safety and governance**
   - Tool permissions, approvals, sandboxing, and hooks changed what “compatible” means beyond markdown syntax.

5. **Emerging open standards**
   - `AGENTS.md` and open skill folder conventions increasingly act as an interoperability layer, but they still do not cover the full execution/governance feature set.

The key implication for CACE is that **compatibility can no longer be modeled as a static format matrix alone**. It needs to be understood as a moving target shaped by product evolution, especially in:

- **Claude Code**
- **Windsurf**
- **Cursor**
- **Codex**
- **OpenCode**

Gemini and `AGENTS.md`-style interoperability are increasingly important, but their public historical timelines are less explicit than the changelog-heavy products above.

---

## Scope and Evidence Model

This document distinguishes between three evidence classes:

- **[official-changelog]**
  - Explicit dated release notes or changelog entries.

- **[official-docs]**
  - Current official documentation describing supported behavior.

- **[project-model]**
  - Existing CACE version catalog or compatibility logic already encoded in the repo.

Where public historical evidence is incomplete, this document states that explicitly rather than over-claiming certainty.

---

## Compatibility Turning Points Timeline

| Window | Agent | Turning Point | Why it changed compatibility | Evidence |
|---|---|---|---|---|
| 2024-04 | Cursor | `.cursorrules` established as repo-level rule format | Compatibility was mostly prompt/rule-text translation, not execution translation | [project-model] `src/versioning/version-catalog.ts` |
| 2024-11 | Windsurf | `workflows` and `rules` appear as distinct primitives | CACE must distinguish manual procedural artifacts from persistent behavioral guidance | [project-model] `src/versioning/version-catalog.ts` |
| 2025-02 | Claude Code | Skills, commands, `context: fork`, `allowed-tools`, memory imports modeled as baseline | Claude became the richest source format in CACE, but also the most lossy to downgrade from | [project-model] `src/versioning/version-catalog.ts` |
| 2025-06 | Claude Code | Hooks, subagents, model selection | Compatibility moves beyond markdown into lifecycle automation and delegated execution | [project-model] `src/versioning/version-catalog.ts`, [official-docs] Claude hooks/subagents docs |
| 2025-06 | Windsurf | `wave-10` introduces skills alongside workflows | Windsurf becomes bifurcated: auto-invoked skills vs manual-only workflows | [project-model] `src/versioning/version-catalog.ts`, [official-docs] Windsurf skills/workflows docs |
| 2025-06 | Cursor | Custom commands available | Cursor becomes a stronger manual-invocation target for converted procedures | [project-model] `src/versioning/version-catalog.ts` |
| 2025-08 | Cursor | Hooks and newer rule system tracked at `1.7` | Compatibility expands from passive rules to runtime governance and agent-loop control | [official-changelog] Cursor 1.7, [project-model] `src/versioning/version-catalog.ts` |
| 2025-10 | Codex | Codex matures as a stable product surface (note: npm versioning remains 0.x) | Codex shifts from emerging target to stable compatibility surface | [official-changelog] Codex changelog, [official-docs] Codex feature maturity page |
| 2025-12 | Codex | Agent skills land in Codex | Codex becomes meaningfully closer to Claude/Windsurf/OpenCode skill ecosystems | [official-changelog] Codex changelog |
| 2025-12 | Windsurf | Parallel sessions/worktrees mature in `wave-13` | Compatibility now includes multi-session orchestration patterns, not just single-artifact conversion | [project-model] `src/versioning/version-catalog.ts`, [official-docs] Windsurf docs |
| 2026-01 | Cursor | Skills and subagents arrive in `2.4` | Cursor moves materially closer to Claude/OpenCode/Codex on reusable procedural artifacts | [official-changelog] Cursor 2.4 |
| 2026-01 | Codex | `AGENTS.md` guidance chain and team config become documented | Codex strengthens hierarchical instruction compatibility with the broader `AGENTS.md` ecosystem | [official-changelog] Codex changelog, [official-docs] Codex AGENTS.md guide |
| 2026-03 | OpenCode | Claude-compatible prompts and skills clearly documented | OpenCode becomes less of a conversion target in some cases and more of a native compatibility consumer | [official-docs] OpenCode rules/skills docs |
| 2026-03 | Gemini CLI | Hierarchical `GEMINI.md`, JIT context discovery, imports, custom context filenames documented | Gemini becomes more compatible at the memory/context layer, but still lighter on governance/hook parity | [official-docs] Gemini CLI docs |
| 2026-03 | AGENTS.md ecosystem | Jurisdiction/accumulation/precedence semantics are being explicitly standardized | `AGENTS.md` is maturing into the shared compatibility baseline for instruction files across tools | [official-docs] agents.md repo, [official-docs] agents.md v1.1 proposal |

---

## Agent-by-Agent Evolution

## 1. Claude Code

### Evolution

Claude evolved from a strong markdown-driven skill system into a broader execution platform with:

- skills
- commands
- hooks
- subagents
- background execution
- rules separated from core memory files

The important historical change is not just “more features.” It is that Claude’s features are tightly coupled to **execution semantics**:

- `allowed-tools`
- `context: fork`
- `agent`
- hook lifecycle events
- background subagents with inherited permissions

That makes Claude the **highest-fidelity authoring source** in CACE, but also the source with the greatest downstream loss when targeting agents without equivalent runtime controls.

### Compatibility impact on CACE

- Claude-to-anything conversion is increasingly about preserving **behavioral intent**, not only syntax.
- Older CACE assumptions that treated Claude artifacts mainly as frontmatter + body are now incomplete.
- Hooks and subagents make Claude a source of governance and orchestration artifacts, not just skills.

### Distilled current position

For CACE, Claude should be treated as the **most semantically expressive source format**.

---

## 2. Windsurf

### Evolution

Windsurf’s compatibility story changed in two major phases:

1. **Early phase**
   - workflows and rules gave it a manual procedure layer plus behavioral guidance.

2. **Later phase**
   - skills, hooks, `AGENTS.md`, worktrees, and richer Cascade customization made it a broader scaffold target.

The most important change is the formal distinction between:

- **Skills**
  - auto-invoked through progressive disclosure or `@mention`

- **Workflows**
  - manual-only slash command procedures

That split means Windsurf does not map cleanly to a single Claude artifact type when the source combines both auto-invocation and manual invocation.

### Compatibility impact on CACE

- Windsurf is no longer “just another markdown target.”
- Conversion into Windsurf requires choosing between:
  - auto behavior
  - manual behavior
  - or dual-output generation
- Windsurf hooks broaden compatibility for lifecycle automation, but the event model is Cascade-specific and not a direct clone of Claude’s lifecycle.
- `AGENTS.md` and rules reduce friction for instruction portability, but they do not solve the skills/workflows split.

### Distilled current position

For CACE, Windsurf should be modeled as a **dual-lane target**:

- **procedural/manual lane** via workflows
- **auto/progressive lane** via skills

---

## 3. Cursor

### Evolution

Cursor has undergone one of the clearest public compatibility evolutions:

1. **`.cursorrules` era**
   - broad repository rules

2. **commands + newer rules era**
   - procedural invocation becomes more explicit

3. **hooks era**
   - runtime governance enters the model

4. **skills + subagents era**
   - Cursor becomes much closer to Claude, OpenCode, and Codex in procedural artifact design

The significance of Cursor 2.4 is substantial: once skills and subagents land, Cursor stops being only a rules/commands target and becomes a genuine participant in the reusable skill ecosystem.

### Compatibility impact on CACE

- CACE’s older model of “Cursor = mostly commands/rules” is historically incomplete.
- The practical compatibility story for Cursor now depends on version:
  - early Cursor favors rule translation
  - middle Cursor favors commands + hooks
  - current Cursor supports skills/subagents as higher-fidelity targets
- This materially improves compatibility for Claude/OpenCode/Codex skill-style artifacts.

### Distilled current position

For CACE, Cursor should be modeled as a **historically shifting target**:

- legacy: rule-centric
- mid-stage: command + hooks-centric
- current: increasingly skill/subagent-capable

---

## 4. OpenCode

### Evolution

The current public docs show OpenCode as increasingly aligned with open interoperability rather than strict proprietary isolation.

By March 2026, OpenCode documents support for:

- project and global `AGENTS.md`
- fallback `CLAUDE.md`
- fallback `.claude/skills`
- its own `.opencode/skills`
- agent-compatible `.agents/skills`
- skill permissions and per-agent overrides

This matters because OpenCode is not only a conversion target. It is also a **native reader of other ecosystems’ artifacts**.

### Compatibility impact on CACE

- Some Claude-to-OpenCode conversions are lower value than direct reuse.
- OpenCode’s permission model gives it better semantic proximity to Claude than many other targets.
- Its compatibility behavior is partly filesystem-discovery-driven, not just content-driven.

### Distilled current position

For CACE, OpenCode should often be treated as a **compatibility consumer**, not merely a destination format.

That means CACE should prefer:

- detection
- advisory output
- reuse recommendations

before destructive conversion.

### Confidence note

Public current docs are strong, but the exact dated introduction points for several OpenCode compatibility features are less explicit than Cursor/Codex changelogs.

---

## 5. Codex

### Evolution

Codex has changed rapidly from a general coding agent into a scaffold ecosystem with:

- `AGENTS.md`-based instruction discovery
- agent skills
- implicit and explicit skill invocation
- user/admin/system skill locations
- optional skill metadata via `agents/openai.yaml`
- plugin and app-surface integration

The public changelog shows two especially important shifts:

- **October 2025**
  - Codex reaches GA, making it a stable CACE target.

- **December 2025 onward**
  - skills become part of the official Codex model.

By early 2026, Codex also documents a clear `AGENTS.md` discovery chain with:

- global scope
- project scope
- per-directory accumulation
- override files
- size limits

### Compatibility impact on CACE

- Codex is no longer best modeled as only “commands + approval policy.”
- It now shares meaningful structure with the broader skills ecosystem.
- `AGENTS.md` support makes Codex an increasingly strong target for the universal memory/instructions layer.
- Skill metadata and policy controls introduce agent-app concerns that do not map directly from simpler markdown formats.

### Distilled current position

For CACE, Codex should be treated as a **first-class skill and AGENTS-compatible target**, not a secondary add-on.

---

## 6. Gemini CLI

### Evolution

Gemini’s public docs strongly document the current context model but expose fewer explicit dated turning points than Cursor or Codex.

The current model includes:

- hierarchical `GEMINI.md`
- global, workspace, and JIT-discovered context files
- `@file` imports
- `/memory` commands
- configurable context file names, including `AGENTS.md`

That means Gemini has moved beyond a single flat project prompt file and toward a layered context system closer to Claude/Codex/OpenCode in spirit.

### Compatibility impact on CACE

- Gemini is stronger than a naïve “flat markdown memory” target would suggest.
- It now supports:
  - hierarchy
  - imports
  - configurable filenames
- But the publicly documented compatibility story remains much stronger for context files than for hooks, governance, or deep scaffold orchestration.

### Distilled current position

For CACE, Gemini should be treated as a **strong memory/context target with lighter governance parity**.

### Confidence note

Current capability evidence is strong, but dated milestone granularity is weaker than for Cursor, Claude, Windsurf, and Codex.

---

## 7. AGENTS.md as the Interoperability Layer

### Evolution

`AGENTS.md` has become increasingly important not because every tool implements it identically, but because more tools now converge on the same basic ideas:

- ancestor-based scope
- cumulative inheritance
- local overrides taking precedence
- repository-root discovery
- instruction files as durable, version-controlled agent guidance

The agents.md repository and v1.1 proposal make previously implicit semantics explicit:

- **jurisdiction**
- **accumulation**
- **precedence**
- **implicit inheritance**

This is a major compatibility development because it reduces ambiguity for the lowest common denominator layer.

### Compatibility impact on CACE

- `AGENTS.md` should be treated as the most important shared denominator for instruction portability.
- It is especially strong for:
  - project guidance
  - nested directory guidance
  - universal memory/instructions
- It is not sufficient for:
  - hooks
  - permissions
  - subagents
  - workflow invocation semantics

### Distilled current position

For CACE, `AGENTS.md` is the **best universal instructions substrate**, but not the universal solution for runtime behavior.

---

## What Changed in the Meaning of “Compatibility”

Across the 2024-2026 window, compatibility changed in four major ways.

### 1. From file conversion to behavior preservation

Earlier compatibility could often be approximated by mapping markdown files and frontmatter.

Current compatibility increasingly requires preserving:

- tool restrictions
- invocation policy
- inheritance rules
- hook timing
- isolated vs shared context
- subagent boundaries

### 2. From one artifact per concept to split artifact families

Windsurf is the clearest example:

- skills and workflows divide auto vs manual behavior

Cursor and Codex also increasingly separate:

- rules
- skills
- commands
- hooks
- subagents

### 3. From proprietary formats to partial convergence

There is meaningful convergence now around:

- `AGENTS.md`
- `SKILL.md`
- progressive disclosure
- directory-based discovery

But convergence is still partial. The runtime and governance layers remain product-specific.

### 4. From static support claims to version-sensitive compatibility

The same agent name can imply meaningfully different compatibility depending on version.

Examples:

- Cursor before and after skills
- Windsurf before and after skills
- Claude before and after hooks/subagents/rules split
- Codex before and after skills and AGENTS discovery

---

## Implications for CACE

## 1. The current version-aware model is directionally correct

CACE is right to have a version catalog and migration logic.

However, the current in-repo version model is much more developed for:

- Claude
- Windsurf
- Cursor

than for:

- Codex
- OpenCode
- Gemini
- Universal `AGENTS.md`

## 2. Compatibility scores should increasingly reflect semantic layers

A future compatibility model should score separately for:

- **instruction portability**
- **invocation parity**
- **governance parity**
- **execution isolation parity**
- **automation/lifecycle parity**

A single fidelity number is still useful, but it hides where compatibility actually changed over time.

## 3. OpenCode and AGENTS.md reduce the need for some conversions

Where a target natively consumes:

- `CLAUDE.md`
- `.claude/skills`
- `AGENTS.md`
- `.agents/skills`

CACE should increasingly surface:

- direct-use recommendations
- advisory transformations
- compatibility warnings

instead of assuming conversion is always the best outcome.

## 4. Windsurf and Cursor need more version-sensitive routing logic than static labels imply

Because their artifact systems evolved materially, routing decisions should account for target version where possible.

Examples:

- older Cursor favors rule/command output
- newer Cursor may justify direct skill output
- Windsurf versions before skills should not be treated like current Windsurf

## 5. Public historical evidence is uneven and should be modeled honestly

CACE should separate:

- **strongly evidenced dated milestones**
- **current documented behavior**
- **project-internal assumptions or heuristics**

This is especially important for product-facing version detection and migration claims.

---

## Recommended Follow-on Work in This Repo

1. **Keep this document as the historical source of truth**
   - Use it to explain why compatibility assumptions changed.

2. **Link this research from parity and matrix docs**
   - So snapshot docs do not get mistaken for historical truth.

3. **Extend version-aware coverage only where evidence is strong**
   - Codex is the strongest next candidate.
   - Cursor/Windsurf/Claude already have the best evidence trail.

4. **Separate universal-instructions compatibility from runtime compatibility**
   - `AGENTS.md` and `GEMINI.md` should not imply hook or permission parity.

5. **Prefer advisory or native-reuse paths where tools already interoperate**
   - Especially OpenCode and `AGENTS.md`-compatible workflows.

---

## References

### Official documentation and changelogs reviewed

- Claude Code hooks: `https://code.claude.com/docs/en/hooks-guide`
- Claude Code subagents: `https://code.claude.com/docs/en/sub-agents`
- Windsurf skills: `https://docs.windsurf.com/windsurf/cascade/skills`
- Windsurf workflows: `https://docs.windsurf.com/windsurf/cascade/workflows`
- Windsurf hooks / memories / rules content via docs export: `https://docs.windsurf.com/llms-full.txt`
- Cursor changelog 1.7: `https://cursor.com/changelog/1-7`
- Cursor changelog 2.4: `https://cursor.com/changelog/2-4`
- OpenCode skills: `https://opencode.ai/docs/skills/`
- OpenCode rules: `https://opencode.ai/docs/rules/`
- Codex changelog: `https://developers.openai.com/codex/changelog/`
- Codex AGENTS guide: `https://developers.openai.com/codex/guides/agents-md/`
- Codex skills: `https://developers.openai.com/codex/skills/`
- Gemini CLI repository and context docs: `https://github.com/google-gemini/gemini-cli` and `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md`
- agents.md repository: `https://github.com/agentsmd/agents.md`
- agents.md v1.1 proposal: `https://github.com/agentsmd/agents.md/issues/135`

### Internal project sources reviewed

- `README.md`
- `docs/AGENT_PARITY_KNOWLEDGE.md`
- `docs/research/agent-artifact-compatibility-matrix.md`
- `src/core/constants.ts`
- `src/core/artifact-support.ts`
- `src/transformation/capability-mapper.ts`
- `src/versioning/version-catalog.ts`
- `src/versioning/version-detector.ts`
- `src/versioning/migration-guide.ts`

---

## Final Distillation

The current project should treat compatibility as a layered, time-sensitive system:

- **Universal guidance compatibility** is improving.
- **Skill interoperability** is improving.
- **Hook, permission, isolation, and agent-runtime compatibility** remains uneven.
- **Version matters** more now than it did when the project’s earliest matrices were created.

That is the central historical lesson from the public documentation.
