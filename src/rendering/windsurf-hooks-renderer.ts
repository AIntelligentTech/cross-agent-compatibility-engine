/**
 * Renderer: Claude Code hooks/settings.json → Windsurf .windsurf/hooks.json
 *
 * Converts Claude Code hook configurations into their nearest Windsurf Cascade
 * Hook equivalents. Documents every semantic gap as a loss or warning so that
 * callers can present an accurate fidelity picture to the user.
 *
 * Critical differences handled here:
 * 1. Exit code semantics — Claude blocks on any non-zero; Windsurf blocks only
 *    on exit 2. Scripts relying on exit 1 for blocking MUST be updated.
 * 2. No matcher field — Windsurf hooks have no matcher. Scripts that were
 *    scoped to a subset of tools via matcher must self-filter in the script body.
 * 3. Post-hooks are async — post_cascade_response cannot block the agent.
 * 4. Field names differ — tool_name → agent_action_name; session_id →
 *    trajectory_id. Script bodies require manual adaptation.
 * 5. No equivalent for SessionStart / SubagentStart — recorded as losses.
 */

import type { WindsurfHook } from "../parsing/windsurf-hooks-parser.js";

// ============================================================================
// Result Types
// ============================================================================

export interface HookLoss {
  /** The Claude Code event that could not be represented */
  claudeEvent: string;
  /** Human-readable explanation of why the event is unrepresentable */
  reason: string;
}

export interface HookWarning {
  /** Short machine-readable code for the warning class */
  code: string;
  /** Human-readable description */
  message: string;
}

export interface WindsurfHooksRenderResult {
  /** JSON string suitable for writing to .windsurf/hooks.json */
  hooksJson: string;
  /** Events that have no Windsurf equivalent */
  losses: HookLoss[];
  /** Semantic differences that require manual review or script adaptation */
  warnings: HookWarning[];
  /**
   * Fidelity score 0–100.
   * Starts at 100, -10 per loss, -3 per warning (minimum 0).
   */
  fidelityScore: number;
}

// ============================================================================
// Internal types that mirror the Claude Code settings.json hook shape
// ============================================================================

interface ClaudeHookEntry {
  type?: string;
  command?: string;
  timeout?: number;
  async?: boolean;
  statusMessage?: string;
  run_in_background?: boolean;
  [key: string]: unknown;
}

interface ClaudeHookGroup {
  matcher?: string;
  hooks?: ClaudeHookEntry[];
  // Claude Code also allows hooks at the group level (no nested array)
  type?: string;
  command?: string;
  [key: string]: unknown;
}

interface ClaudeEventGroup {
  // The outer settings.json has { hooks: { EVENT: [ group, ... ] } }
  [eventName: string]: ClaudeHookGroup[];
}

// ============================================================================
// Event mapping table
// ============================================================================

/**
 * Each entry maps a (Claude event, matcher regex or undefined) pair to one or
 * more Windsurf event names.
 *
 * Matcher patterns are tested with RegExp. The first rule whose matcher
 * matches (or which has no matcher) wins for a given Claude hook.
 *
 * A `null` Windsurf event means the Claude event is unrepresentable.
 */
const CLAUDE_TO_WINDSURF_EVENTS: Array<{
  claudeEvent: string;
  // If undefined, matches any matcher value
  matcherPattern?: RegExp;
  windsurfEvents: string[] | null;
  lossReason?: string;
}> = [
  // PreToolUse
  {
    claudeEvent: "PreToolUse",
    matcherPattern: /Read|Glob|Grep/,
    windsurfEvents: ["pre_read_code"],
  },
  {
    claudeEvent: "PreToolUse",
    matcherPattern: /Edit|Write/,
    windsurfEvents: ["pre_write_code"],
  },
  {
    claudeEvent: "PreToolUse",
    matcherPattern: /Bash/,
    windsurfEvents: ["pre_run_command"],
  },
  {
    claudeEvent: "PreToolUse",
    matcherPattern: /mcp__/,
    windsurfEvents: ["pre_mcp_tool_use"],
  },
  // PostToolUse
  {
    claudeEvent: "PostToolUse",
    matcherPattern: /Read/,
    windsurfEvents: ["post_read_code"],
  },
  {
    claudeEvent: "PostToolUse",
    matcherPattern: /Edit|Write/,
    windsurfEvents: ["post_write_code"],
  },
  {
    claudeEvent: "PostToolUse",
    matcherPattern: /Bash/,
    windsurfEvents: ["post_run_command"],
  },
  {
    claudeEvent: "PostToolUse",
    matcherPattern: /mcp__/,
    windsurfEvents: ["post_mcp_tool_use"],
  },
  // Stop and TaskCompleted both map to post_cascade_response
  {
    claudeEvent: "Stop",
    windsurfEvents: ["post_cascade_response"],
  },
  {
    claudeEvent: "TaskCompleted",
    windsurfEvents: ["post_cascade_response"],
  },
  // No equivalents
  {
    claudeEvent: "SessionStart",
    windsurfEvents: null,
    lossReason:
      "Windsurf Cascade has no session-start lifecycle hook. These hooks run once when a Claude Code session begins and have no Cascade equivalent.",
  },
  {
    claudeEvent: "SubagentStart",
    windsurfEvents: null,
    lossReason:
      "Windsurf Cascade has no sub-agent lifecycle concept. These hooks fire when Claude spawns a background agent — Cascade does not support this pattern.",
  },
];

// ============================================================================
// Renderer
// ============================================================================

export class WindsurfHooksRenderer {
  /**
   * Convert a Claude Code settings.json string to a Windsurf hooks result.
   *
   * The renderer converts only the configuration structure. Hook scripts
   * themselves are NOT rewritten — callers must separately update scripts to:
   * - Use `exit 2` instead of `exit 1` for blocking behaviour
   * - Read `agent_action_name` instead of `tool_name` from stdin
   * - Read `trajectory_id` instead of `session_id` from stdin
   * - Self-filter based on `agent_action_name` when the Claude matcher was
   *   narrower than the mapped Windsurf event covers
   */
  renderFromClaudeSettings(settingsJson: string): WindsurfHooksRenderResult {
    const losses: HookLoss[] = [];
    const warnings: HookWarning[] = [];

    // Parse settings.json
    let settings: { hooks?: ClaudeEventGroup };
    try {
      settings = JSON.parse(settingsJson) as { hooks?: ClaudeEventGroup };
    } catch (err) {
      // Return an empty but valid result on parse failure
      return {
        hooksJson: JSON.stringify({ hooks: {} }, null, 2),
        losses: [
          {
            claudeEvent: "(parse error)",
            reason: `Could not parse settings.json: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        warnings: [],
        fidelityScore: 0,
      };
    }

    const claudeHooks = settings.hooks ?? {};

    // Accumulate Windsurf hooks: event → Set of command strings (for dedup)
    // We use a Map<windsurfEvent, WindsurfHook[]> and deduplicate by command.
    const windsurfHooksMap = new Map<string, WindsurfHook[]>();

    // Track which Claude events produced losses (avoid duplicate loss entries)
    const recordedLosses = new Set<string>();

    for (const [claudeEvent, groupList] of Object.entries(claudeHooks)) {
      if (!Array.isArray(groupList)) continue;

      for (const group of groupList) {
        const matcher = typeof group.matcher === "string" ? group.matcher : undefined;

        // Collect individual hook entries from this group
        const hookEntries: ClaudeHookEntry[] = [];
        if (Array.isArray(group.hooks)) {
          for (const h of group.hooks) {
            if (typeof h === "object" && h !== null) {
              hookEntries.push(h as ClaudeHookEntry);
            }
          }
        } else if (typeof group.command === "string") {
          // Flat group (no nested hooks array)
          hookEntries.push(group as ClaudeHookEntry);
        }

        for (const hookEntry of hookEntries) {
          if (typeof hookEntry.command !== "string") continue;

          // Determine which Windsurf events this hook maps to
          const mapping = this.resolveMapping(claudeEvent, matcher);

          if (mapping.windsurfEvents === null) {
            // Unrepresentable event — record a loss (once per event)
            const lossKey = claudeEvent;
            if (!recordedLosses.has(lossKey)) {
              recordedLosses.add(lossKey);
              losses.push({
                claudeEvent,
                reason: mapping.lossReason ?? `No Windsurf equivalent for Claude event "${claudeEvent}"`,
              });
            }
            continue;
          }

          // Emit a warning about stdin field renaming (once per render)
          this.ensureStdinFieldWarning(warnings);

          // Emit warning about exit code semantics for command hooks (once per render)
          this.ensureExitCodeWarning(warnings);

          // Post-hooks are async in Windsurf — warn once
          if (
            mapping.windsurfEvents.includes("post_cascade_response") ||
            mapping.windsurfEvents.some((e) => e.startsWith("post_"))
          ) {
            this.ensureAsyncPostHookWarning(warnings, mapping.windsurfEvents);
          }

          // Build the WindsurfHook
          const windsurfHook: WindsurfHook = {
            command: hookEntry.command,
            show_output: true,
          };

          // Distribute to each target Windsurf event
          for (const windsurfEvent of mapping.windsurfEvents) {
            if (!windsurfHooksMap.has(windsurfEvent)) {
              windsurfHooksMap.set(windsurfEvent, []);
            }

            const existing = windsurfHooksMap.get(windsurfEvent)!;
            // Deduplicate by command string (e.g. Stop + TaskCompleted → post_cascade_response)
            const alreadyPresent = existing.some(
              (h) => h.command === windsurfHook.command,
            );
            if (!alreadyPresent) {
              existing.push({ ...windsurfHook });
            }
          }
        }
      }
    }

    // Build the output object
    const outputHooks: Record<string, WindsurfHook[]> = {};
    for (const [event, hooks] of windsurfHooksMap.entries()) {
      outputHooks[event] = hooks;
    }

    const hooksJson = JSON.stringify({ hooks: outputHooks }, null, 2);

    const fidelityScore = this.computeFidelity(losses, warnings);

    return { hooksJson, losses, warnings, fidelityScore };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Resolve which Windsurf event(s) a Claude (event, matcher) pair maps to.
   *
   * When a matcher covers multiple tool categories (e.g. "Edit|Write|Bash"),
   * the mapping produces multiple Windsurf events.
   */
  private resolveMapping(
    claudeEvent: string,
    matcher: string | undefined,
  ): {
    windsurfEvents: string[] | null;
    lossReason?: string;
  } {
    // Collect all rules for this Claude event
    const rulesForEvent = CLAUDE_TO_WINDSURF_EVENTS.filter(
      (r) => r.claudeEvent === claudeEvent,
    );

    if (rulesForEvent.length === 0) {
      return {
        windsurfEvents: null,
        lossReason: `No mapping defined for Claude Code event "${claudeEvent}"`,
      };
    }

    // Check for explicit null-mapping (unrepresentable events like SessionStart)
    const nullRule = rulesForEvent.find((r) => r.windsurfEvents === null);

    // If the event always maps to null (regardless of matcher), return null
    const allNull = rulesForEvent.every((r) => r.windsurfEvents === null);
    if (allNull && nullRule) {
      return { windsurfEvents: null, lossReason: nullRule.lossReason };
    }

    if (!matcher) {
      // No matcher — aggregate all non-null Windsurf events for this Claude event
      const events = rulesForEvent
        .filter((r) => r.windsurfEvents !== null)
        .flatMap((r) => r.windsurfEvents as string[]);
      return { windsurfEvents: [...new Set(events)] };
    }

    // With a matcher, find which rules' matcherPattern the matcher string satisfies.
    // A rule matches if the matcher string contains a token that matches the rule's pattern.
    const matchedEvents: string[] = [];

    for (const rule of rulesForEvent) {
      if (rule.windsurfEvents === null) continue;

      if (!rule.matcherPattern) {
        // Rule with no pattern catches everything
        matchedEvents.push(...rule.windsurfEvents);
        continue;
      }

      if (rule.matcherPattern.test(matcher)) {
        matchedEvents.push(...rule.windsurfEvents);
      }
    }

    if (matchedEvents.length === 0) {
      // Matcher present but matched nothing — treat as unrepresentable
      return {
        windsurfEvents: null,
        lossReason: `Claude event "${claudeEvent}" with matcher "${matcher}" has no Windsurf equivalent`,
      };
    }

    return { windsurfEvents: [...new Set(matchedEvents)] };
  }

  private ensureStdinFieldWarning(warnings: HookWarning[]): void {
    const code = "STDIN_FIELD_RENAME_REQUIRED";
    if (warnings.some((w) => w.code === code)) return;
    warnings.push({
      code,
      message:
        "Hook scripts read stdin field names that differ between platforms. " +
        "Windsurf uses agent_action_name (not tool_name) and trajectory_id (not session_id). " +
        "File-path and command-line data is nested under tool_info.* in Windsurf. " +
        "All converted scripts must be manually updated to use the Windsurf field names.",
    });
  }

  private ensureExitCodeWarning(warnings: HookWarning[]): void {
    const code = "EXIT_CODE_SEMANTICS_CHANGED";
    if (warnings.some((w) => w.code === code)) return;
    warnings.push({
      code,
      message:
        "Claude Code blocks on any non-zero exit code. Windsurf blocks ONLY on exit code 2. " +
        "Scripts that use `exit 1` to block execution must be updated to use `exit 2` instead. " +
        "Exit code 1 is treated as a non-blocking warning in Windsurf Cascade.",
    });
  }

  private ensureAsyncPostHookWarning(
    warnings: HookWarning[],
    windsurfEvents: string[],
  ): void {
    const code = "POST_HOOKS_ARE_ASYNC";
    if (warnings.some((w) => w.code === code)) return;
    const affectedEvents = windsurfEvents.filter((e) => e.startsWith("post_"));
    if (affectedEvents.length === 0) return;
    warnings.push({
      code,
      message:
        `Windsurf post-hooks (${affectedEvents.join(", ")}) run asynchronously and cannot block the agent. ` +
        "In Claude Code, Stop and TaskCompleted hooks can block (on non-zero exit). " +
        "Any blocking behaviour in these hooks will be silently ignored in Windsurf.",
    });
  }

  private computeFidelity(losses: HookLoss[], warnings: HookWarning[]): number {
    let score = 100;
    score -= losses.length * 10;
    score -= warnings.length * 3;
    return Math.max(0, score);
  }
}
