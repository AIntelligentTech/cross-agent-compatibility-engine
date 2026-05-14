# CACE Compatibility Truthfulness Audit — 2026-05-14

**Scope:** evidence-based comparison of CACE's claims (worktree-integration branch, the about-to-merge state) against current official vendor docs and changelogs as of 2026-05-14.
**Method:** 6 parallel research agents, one per coding-agent harness, each fetching primary-source docs and verifying CACE's claims with URL citations.
**Bottom-line verdict:** CACE has **partial verified confidence (~40-60% per agent) with measurable false-confidence in several specific claims**. The audit's own April-11 walk-back was correct in direction but insufficient in scope. Continued use without correction will produce silent feature drops on export and incorrect compatibility gating.

---

## Verdict at a glance

| Agent | CACE's claimed current version | Actual latest (2026-05-14) | Staleness | Verified claims | Fabricated claims |
|---|---|---|---|---|---|
| Claude Code | 2.1 (2026-02-18) | **v2.1.141 (2026-05-13)** — patch train through May 13 | ~3 months on date; version model wrong | ~55% | 1 fake breaking change (`claude-rules-location`) |
| Cursor | 3.0 (2026-04-02) | **3.3 (2026-05-07)** + Cloud Agent Dev Envs (May 13) | 3 versions behind | ~45% | 1 fake breaking change (`cursor-cloud-agents-removed`) |
| Windsurf | wave-14 (2026-01-30) | wave-14 still latest **named wave**; but Windsurf 2.0/2.1/**2.2.17 (May 6)** point releases shipped | Missing entire Wave 13 + 2.x line | ~35% | 1 fake breaking change (`windsurf-skills-location`) |
| Codex | epoch 1.2 (CACE-internal) | **v0.130.0 (2026-05-08)**; nightly 0.131.0-alpha.16 | 10 minor versions behind real cadence | ~60% | Epoch model itself is undefensible |
| Gemini CLI | 0.2 (2026-04-01) | **v0.42.0 (2026-05-12)**; nightly v0.44.0 today | Fictitious version string entirely | ~40% | `policy.toml` (wrong shape), `browser` (wrong name) |
| OpenCode | 1.3 (2026-03-22) | **v1.14.50 (2026-05-14, today)** | 13 minor versions behind in 7 weeks | ~60% | "TUI plugin system" mislabel, URL-sourced instructions |

**Summary:** every single agent is significantly out of date, several have fabricated breaking changes, and the audit doc from April 11 walked back the *direction* but did not catch the *specific* fabrications.

---

## Cross-cutting findings

### 1. The version model is fundamentally wrong (highest-impact systemic issue)

CACE pins each agent to a single `isCurrent: true` semver bucket. Every harness ships near-daily patch releases:

- **Claude Code**: 2.1.111 (Apr 16) → 2.1.137 → 2.1.139 → 2.1.140 → 2.1.141 (May 13). Effort levels for Opus 4.7 (`xhigh`) require ≥ 2.1.111.
- **Cursor**: 3.0 → 3.1 → 3.2 → **3.3 (May 7)**, plus dated changelog entries on May 11 and May 13.
- **Codex CLI**: ~weekly minor bumps (0.128 → 0.129 → 0.130 in 8 days, each shipping non-trivial features — plugin marketplace, goals, vim mode, plugin sharing, remote control).
- **OpenCode**: 1.3 → 1.14.50 in 7 weeks (~13 minor versions). Near-daily releases.
- **Gemini CLI**: 0.41.x stable, 0.42.0 (May 12), 0.43-preview, 0.44-nightly today.

**Impact:** every feature-gate decision in CACE's `version-detector.ts` is operating on stale or fictitious version data, so:
- Feature availability checks will mis-classify the source project
- Migration suggestions will be wrong-direction
- "Latest/current" reasoning is brittle and will become more wrong every week

**Fix direction:** pin feature support to *concrete vendor minor versions* (e.g. Codex skills `≥0.124`, Codex plugins `≥0.128`, Claude effort `xhigh` `≥2.1.111`) and replace `isCurrent` bucket flags with a dated-pull mechanism. The audit doc's "compatibility epochs" framing is fine as a user-facing label, but ONLY if backed by a real vendor-version mapping table that gets updated.

### 2. Three fabricated breaking changes need deletion

These are not in the vendor docs and originate as PR-2-era over-claims; they will incorrectly suppress legitimate artifacts during conversion:

| Fabricated breaking change | Reality |
|---|---|
| `claude-rules-location` (1.2): "rules moved from inline CLAUDE.md → .claude/rules/" | **FALSE.** CLAUDE.md remains the canonical mechanism; `.claude/rules/` is additive path-scoping. No breaking move occurred. |
| `cursor-cloud-agents-removed` (2.4) | **FALSE.** Cursor 2.4 (2026-01-22) **introduced** Skills, Subagents, Image Generation. Cloud agents were not removed; they remained and were enhanced. Self-hosted cloud agents added separately on 2026-03-25. |
| `windsurf-skills-location` (wave-9, 2025-11-15): "skills moved to .windsurf/skills/" | **FALSE.** Agent Skills did not exist before Wave 13 (2025-12-24); there was no prior `.windsurf/skills/` to migrate from. The breaking-change is fiction. |

### 3. AGENTS.md is the missing universal hook

Five of six harnesses now support `AGENTS.md`, but CACE only models it for `universal` and `opencode`:

| Agent | Supports AGENTS.md? | CACE represents it for this agent? |
|---|---|---|
| Claude Code | Not yet first-class (uses CLAUDE.md) | n/a |
| Cursor | Referenced in current rules docs | **No** |
| Windsurf | Yes — `docs.windsurf.com/windsurf/cascade/agents-md` ("auto-discovers AGENTS.md/agents.md workspace-wide and feeds the Rules engine") | **No** |
| Codex | Yes — `AGENTS.md` + `AGENTS.override.md` officially documented + `project_doc_fallback_filenames` for aliases | **No** (CACE looks for fake `CODEX.md` instead) |
| Gemini CLI | Yes — `context.fileName: ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]` in settings.json | **No** |
| OpenCode | Yes — primary; CLAUDE.md fallback | **Yes** |

**Impact:** rendering an AGENTS.md-authored project loses the universal hook that *is* the closest thing to a cross-agent canonical IR in the wild today. Adding AGENTS.md as a first-class artifact for Cursor, Windsurf, Codex, and Gemini is the single highest-leverage fix.

### 4. CLAUDE.md `render: none` is wrong

`src/core/artifact-support.ts` line 17 sets `claude.memory.render: "none"`, refusing to render CLAUDE.md. But CLAUDE.md is plain Markdown with optional `@path/to/file` import syntax (5-hop max), managed by Claude's own `/init` and `/memory` commands. There is no technical reason CACE shouldn't render it. This is the single biggest fidelity gap going *into* Claude — every non-Claude source project that gets converted *to* Claude silently loses its primary instruction file.

### 5. Hook event coverage is anaemic

| Agent | Vendor reality | CACE coverage |
|---|---|---|
| Claude Code | 29+ documented hook events (PreToolUse, PostToolUse, PromptSubmit, ToolUse, WorktreeCreate, etc., plus prompt-based / agent-based / MCP / async variants) | Single `hooks` artifact, generic |
| Windsurf | 12 documented events: pre/post_read_code, pre/post_write_code, pre/post_run_command, pre/post_mcp_tool_use, pre_user_prompt, post_cascade_response, post_cascade_response_with_transcript, post_setup_worktree | 2 events (transcript + worktree) |

**Impact:** Claude → Windsurf hook conversion drops ~85% of source events silently.

### 6. Subagent format details missing or wrong

| Agent | Vendor reality | CACE state |
|---|---|---|
| Claude Code | `.claude/agents/<name>.md` with description-based delegation; `agent` field in skill frontmatter selects by name | Modelled but `agent` artifact validation thin |
| Codex | `.codex/agents/*.toml` + `~/.codex/agents/*.toml`; built-in `default | worker | explorer` | TOML path **missing**; built-in names verified |
| Gemini CLI | `.gemini/agents/*.md` YAML frontmatter (`name`, `description`, `kind`, `tools`, `model`, `temperature`, `max_turns`); built-in `codebase_investigator`, `cli_help`, `generalist`, **`browser_agent`** | Last built-in named `browser` — **wrong**; should be `browser_agent` |
| OpenCode | `.opencode/agents/<name>.md` YAML; **`mode: subagent` required**; tri-state allow/deny/ask permission model per tool key with glob support | `mode: subagent` requirement missing; `validate: false`; permission model unrepresented |

### 7. Path mistakes that will break round-tripping

| CACE claim | Reality | Impact |
|---|---|---|
| Codex user skills: `~/.codex/skills` | Should be `$HOME/.agents/skills` | User-level skills CACE renders will not be loaded by Codex |
| Codex file patterns include `CODEX.md` | Doesn't exist; Codex uses `AGENTS.md` / `AGENTS.override.md` | Detection of Codex projects via filename matching is broken |
| Codex file patterns include `.codex/*.md` as artifacts | `.codex/` holds `config.toml`, `agents/*.toml`, deprecated `prompts/*.md` — no `.codex/<name>.md` artifact path | Detection wastes cycles on nonexistent patterns |
| Gemini `.gemini/GEMINI.md` | Real paths are workspace `GEMINI.md` and `~/.gemini/GEMINI.md` (global) | Detection misses real path |
| Cursor skills introduced in 2.1 | Introduced in **2.4 (2026-01-22)** | Wrong version gating |
| Windsurf skills introduced in wave-9 | Introduced in **wave-13 (2025-12-24)** | Wrong version gating |
| Windsurf transcript/worktree hooks at wave-14 | Transcript hook 1.9566.9 (Feb 25); worktree hook 1.13.8 (Jan 14) | Wrong version gating |
| Cursor 2.5 date 2026-03-05 | Actually 2026-02-17 | 16-day error |
| Cursor "self-hosted agents" in 2.5 | Actually a separate 2026-03-25 release | Wrong version mapping |

### 8. Features documented but absent from CACE

These are real, currently-shipped vendor features that CACE has no representation for — meaning any project using them will lose them on export, and any conversion *to* the target harness will not produce them:

**Claude Code:**
- `paths:` glob trigger in skill frontmatter (auto-activation)
- `disable-model-invocation`, `user-invocable`, `model`, `allowed-tools` fields
- `$ARGUMENTS[N]`, `$N`, `${CLAUDE_*}` substitutions
- Dynamic context injection (`` !`cmd` `` blocks)
- Plugin marketplace + `.claude-plugin/plugin.json` (entire plugin object model)
- Auto memory at `~/.claude/projects/<p>/memory/MEMORY.md`
- Background agents view (`claude agents`, v2.1.139)
- `--worktree` + `WorktreeCreate` hook
- `skillOverrides`, `availableModels`, `modelOverrides`, `claudeMd` managed setting

**Cursor:**
- Subagents (Cursor 2.4)
- Sandbox Network Controls / sandbox.json (2.5)
- `/multitask` (3.3)
- Async subagent pinning, PR review tabs, Build in Parallel, Split changes into PRs (3.3)
- Microsoft Teams integration (May 11)
- Bugbot Effort Levels (May 11)
- Cloud Agent Dev Environments multi-repo + Dockerfile config (May 13)
- Image generation (2.4)
- JetBrains integration (March 2026)

**Windsurf:**
- AGENTS.md auto-discovery
- Global skills: `~/.codeium/windsurf/skills/`, enterprise paths
- Global workflows: `~/.codeium/windsurf/global_workflows/*.md`
- 10 of 12 hook events
- Wave 13 (2025-12-24) entirely
- Windsurf 2.0 (Apr 15), 2.1 (Apr 28), 2.2 (May 6) point releases

**Codex:**
- `requirements.toml` (admin-enforced governance, allowlists)
- `guardian_policy_config` (ChatGPT Business/Enterprise managed review)
- `project_doc_fallback_filenames` (alias mechanism for non-AGENTS.md instruction filenames)
- `project_doc_max_bytes` (32 KiB default) + merge-order semantics for AGENTS.md chain
- Plugin marketplace (0.128.0+), plugin sharing (0.130), Codex for Chrome
- `CODEX_HOME` env var

**Gemini CLI:**
- `~/.gemini/settings.json` schema (security, experimental, context, mcpServers blocks)
- Trusted Folders security model (`security.folderTrust`, `~/.gemini/trustedFolders.json`)
- Custom slash commands (TOML-based `.gemini/commands/*.toml`) — separate from skills
- Extensions system
- Per-subagent inline MCP server declarations
- Linux sandbox modes (gVisor, Docker, Podman, LXC)
- Memory tiers (Tier 1/Tier 2 with `<loaded_context>` wrapping)

**OpenCode:**
- `mode: subagent` requirement in agent frontmatter
- Tri-state permission model (allow/deny/ask, glob-keyed)
- MCP servers as first-class config
- ACP Support, LSP Servers, Formatters, Custom Tools
- Global skills paths
- Plugin event surface (`tui.prompt.append`, `tui.command.execute`, `tui.toast.show`, session compaction)

---

## Conversion fidelity verdicts

For each agent, this is the answer to "if a user converts a real project of agent X to agent Y, how much do we lose?"

| Direction | Verdict | Why |
|---|---|---|
| **Claude → others** | medium-low | Silent drops: `paths:` triggers, dynamic `!`-injection, fork-context, 29 hook events, plugins, auto memory, `$N` substitutions |
| **others → Claude** | medium | Skill / hook / subagent parse cleanly; **CLAUDE.md render-none is the single biggest gap** |
| **Cursor → others** | low | Wrong version mapping (3.0 ≠ current 3.3) breaks compatibility gating; missing subagents + automations features mean they vanish on export |
| **others → Cursor** | low-medium | Rules/skills paths correct; fabricated `cloud-agents-removed` will incorrectly suppress legit cloud-agent artifacts; rules `degraded render` is wrong (`.mdc` is fully native) |
| **Windsurf → others** | moderate-low | Mis-classifies Wave 13 as Wave 9/14; won't recognise AGENTS.md; misses 10 of 12 hook events |
| **others → Windsurf** | moderate | Paths CACE writes are correct, but `skill: degraded render` is wrong (native since Wave 13) |
| **Codex → others** | medium | AGENTS.md, `.agents/skills/*/SKILL.md`, `.codex/config.toml` parse — but `.codex/agents/` TOML, `requirements.toml`, `AGENTS.override.md` chain silently drop |
| **others → Codex** | low-medium | Project skills correct; user-level skills land at wrong path; subagent rendering unaddressed; `requirements.toml` unaddressed |
| **Gemini → others** | low | Surrounding contract (settings.json, trusted folders, policy dir, AGENTS.md alias, version strings) is fictionalised or absent |
| **others → Gemini** | low-medium | Outputs land in correct directories but miss `AGENTS.md` universal hook, omit `settings.json` wiring, target wrong policy file convention |
| **OpenCode → others** | high | OpenCode's artifacts are nearly identical to Claude Code's; AGENTS.md + SKILL.md travel cleanly |
| **others → OpenCode** | high for skills/rules/commands; medium for subagents (needs `mode: subagent` injection + permission translation); low for plugins |

---

## Specific fix-list (ordered by leverage)

### P0 — false confidence (delete fabrications, restore truthfulness)

1. **Delete `claude-rules-location` breaking change** (`src/versioning/version-catalog.ts` around line 122). Rules are additive, not a replacement.
2. **Delete `cursor-cloud-agents-removed` breaking change** (around line 610). 2.4 added features; nothing was removed.
3. **Delete `windsurf-skills-location` breaking change** (around line 367). Skills did not exist before Wave 13 — no migration ever happened.
4. **Delete `codex-path-addressing` feature** (`_CODEX_VENDOR_FEATURE_REFERENCE` line 968). Not documented; subagent addressing uses TOML `name` field.
5. **Fix Codex user skills path**: `~/.codex/skills` → `$HOME/.agents/skills` in `src/core/constants.ts` line 90.
6. **Drop fake Codex file patterns**: remove `CODEX.md` and `.codex/*.md` from `AGENT_FILE_PATTERNS.codex` (`src/core/constants.ts` lines 217-218).
7. **Rename Gemini built-in `browser` → `browser_agent`** in catalog description (line 1003).
8. **Fix Gemini policy file shape**: directory `~/.gemini/policies/*.toml`, not single `policy.toml` (line 1033 description).
9. **Fix CACE date errors:**
   - Cursor 2.5: 2026-02-17 (not 2026-03-05)
   - Windsurf skills: Wave 13, 2025-12-24 (not Wave 9, 2025-11-15)
   - Cursor 2.4 introduces Skills (not 2.1)
10. **Promote `windsurf.skill.render: degraded` → `native`** (`src/core/artifact-support.ts` line 24). Native since Wave 13.

### P1 — true confidence (add the universal hooks that exist)

11. **Add AGENTS.md as a parseable artifact for Cursor, Windsurf, Codex, Gemini** (not just `universal` and `opencode`). This is the highest-leverage cross-agent canonical hook in the real world.
12. **Promote `claude.memory.render: none` → `native`** (line 17). CLAUDE.md is plain Markdown with `@import` — there's no technical reason CACE can't render it. This is the largest single fidelity gap going INTO Claude.
13. **Add AGENTS.override.md detection for Codex** (`src/core/constants.ts` codex patterns).
14. **Add OpenCode `mode: subagent` requirement** + permission tri-state model to validation (`src/core/artifact-support.ts` line 34: `validate: false` → `true`).

### P2 — out-of-date (sync versions to real ship trains)

15. **Replace version model**: stop using `isCurrent` major.minor buckets. Instead, pin feature support to concrete vendor minor versions (table-driven).
16. **Update current versions to 2026-05-14 reality**:
    - Claude 2.1.141 (May 13)
    - Cursor 3.3 (May 7)
    - Codex 0.130.0 (May 8)
    - Gemini 0.42.0 (May 12)
    - OpenCode 1.14.50 (May 14)
    - Windsurf wave-14 (still latest named wave) + 2.0/2.1/2.2.17 point releases
17. **Retire Codex 1.0/1.1/1.2 epoch model** OR explicitly keep as user-facing labels with a documented vendor-version mapping. The current state — epochs presented like vendor versions — is undefensible.

### P3 — false assumptions (representation gaps)

18. **Add Wave 13 to Windsurf catalog** entirely. Insert wave-13 (2025-12-24) row with Agent Skills, Git Worktrees, Multi-Cascade Panes, post_setup_worktree hook.
19. **Expand Windsurf hook events 2 → 12.** All listed in `docs.windsurf.com/windsurf/cascade/hooks`.
20. **Add Cursor subagents (2.4)** + `cursor.subagent` artifact (`src/core/constants.ts` `cursor.componentTypes`).
21. **Add Cursor 3.1, 3.2, 3.3** version entries with their feature deltas.
22. **Add Codex `requirements.toml`** as a config-tier artifact (admin governance — different concern from `config.toml`).
23. **Add Gemini Trusted Folders** model + `~/.gemini/settings.json` + `AGENTS.md`/`CONTEXT.md` via `context.fileName`.
24. **Add OpenCode permission model** (allow/deny/ask tri-state, glob-keyed) to subagent validation.
25. **Add Codex `project_doc_fallback_filenames`** so repos using `TEAM_GUIDE.md` etc. are correctly detected.

---

## Confidence summary

**Question:** "do we have true verified confidence in our tool ability to accurately convert between canonical and compatible agent harness files?"

**Answer:** **No — not yet.** Current state is:

- **~40-60% verified** of catalog claims hold against vendor docs as of 2026-05-14 (varies per agent)
- **3 explicit fabricated breaking changes** that need deletion before they actively damage conversions
- **5 of 6 agents are at least 1 month stale**; OpenCode is 13 minor versions behind in 7 weeks
- **AGENTS.md** — the single most important universal hook in the ecosystem — is underrepresented across 4 of 6 agents
- **CLAUDE.md render-none** silently drops the primary instruction artifact for every conversion *into* Claude
- **Hook coverage** is anaemic (Windsurf 2 of 12 events; Claude effectively just "hooks array")

**What CACE *does* have:**
- Project-level skill paths are correct for all 6 main agents
- Subagent file paths are correct (with the noted Codex TOML gap)
- Frontmatter for skills/rules/commands is broadly correct
- Configuration-file detection works for happy-path projects

**True confidence requires the P0 fixes (above) before the next release.** The April-11 audit walked back the *direction* of overclaims; this audit (May 14) identifies the *specific* fabrications and the *specific* missing features. Both rounds of corrective work are needed for a defensible compatibility engine.

### Recommended next steps

1. Land the P0 fix-list (1-10) as a follow-up PR after PR #2 merges. These are tiny, evidence-cited corrections.
2. Then land P1 (11-14) — adds AGENTS.md universality and the CLAUDE.md render fix; opens up real cross-agent fidelity.
3. P2 (15-17) is the version-model overhaul — bigger architectural change, requires consumer migration. Make it a tracked epic.
4. P3 (18-25) is incremental over the next 4-6 weeks as features ship.
5. **Add a vendor-doc snapshot mechanism**: a quarterly automated job that fetches changelog pages, diffs them against the catalog, and produces a structured "what changed" report. Without this, the catalog will drift again within weeks.

---

**Sources** (one per agent — full citation density in the per-agent agent reports captured in `/tmp/cace-audit-findings.md` and the parallel research transcripts):

- Claude Code: https://code.claude.com/docs/en/changelog, https://code.claude.com/docs/en/skills, https://code.claude.com/docs/en/memory
- Cursor: https://cursor.com/changelog, https://cursor.com/changelog/3-0, https://cursor.com/docs/skills, https://cursor.com/docs/context/rules
- Windsurf: https://windsurf.com/changelog, https://docs.windsurf.com/windsurf/cascade/skills, https://docs.windsurf.com/windsurf/cascade/hooks, https://docs.windsurf.com/windsurf/cascade/agents-md
- Codex: https://github.com/openai/codex/releases, https://developers.openai.com/codex/changelog, https://developers.openai.com/codex/skills, https://developers.openai.com/codex/subagents, https://developers.openai.com/codex/guides/agents-md
- Gemini: https://github.com/google-gemini/gemini-cli/releases, https://geminicli.com/docs/cli/skills/, https://geminicli.com/docs/core/subagents/, https://geminicli.com/docs/cli/trusted-folders/
- OpenCode: https://opencode.ai/docs/, https://opencode.ai/docs/rules/, https://opencode.ai/docs/skills/, https://opencode.ai/docs/agents/, https://github.com/sst/opencode/releases
