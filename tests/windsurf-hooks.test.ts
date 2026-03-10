/**
 * Tests for WindsurfHooksRenderer and WindsurfHooksParser
 *
 * Covers Claude Code → Windsurf Cascade Hooks conversion fidelity,
 * loss/warning accounting, event mapping, deduplication, and JSON validity.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { WindsurfHooksRenderer } from "../src/rendering/windsurf-hooks-renderer.js";
import {
  parseWindsurfHooks,
  type WindsurfHooksSpec,
} from "../src/parsing/windsurf-hooks-parser.js";

// ============================================================================
// Helpers
// ============================================================================

function makeSettings(
  hooks: Record<
    string,
    Array<{ matcher?: string; hooks?: Array<{ type?: string; command: string }> }>
  >,
): string {
  return JSON.stringify({ hooks });
}

const renderer = new WindsurfHooksRenderer();

// ============================================================================
// Event Mapping Tests
// ============================================================================

describe("WindsurfHooksRenderer — event mapping", () => {
  test("PreToolUse matcher Edit|Write maps to pre_write_code", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command", command: "/path/to/check.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).toContain("pre_write_code");
    expect(parsed.hooks["pre_write_code"]).toHaveLength(1);
    const hook = parsed.hooks["pre_write_code"]![0] as { command: string };
    expect(hook.command).toBe("/path/to/check.sh");

    expect(Object.keys(parsed.hooks)).not.toContain("pre_run_command");
    expect(result.losses).toHaveLength(0);
  });

  test("PreToolUse matcher Bash maps to pre_run_command", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "/path/to/bash-check.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).toContain("pre_run_command");
    expect(Object.keys(parsed.hooks)).not.toContain("pre_write_code");

    const hook = parsed.hooks["pre_run_command"]![0] as { command: string };
    expect(hook.command).toBe("/path/to/bash-check.sh");
    expect(result.losses).toHaveLength(0);
  });

  test("PreToolUse matcher Edit|Write|Bash maps to BOTH pre_write_code AND pre_run_command", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Edit|Write|Bash",
          hooks: [{ type: "command", command: "/path/to/combined.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).toContain("pre_write_code");
    expect(Object.keys(parsed.hooks)).toContain("pre_run_command");

    const writeHook = parsed.hooks["pre_write_code"]![0] as { command: string };
    expect(writeHook.command).toBe("/path/to/combined.sh");

    const runHook = parsed.hooks["pre_run_command"]![0] as { command: string };
    expect(runHook.command).toBe("/path/to/combined.sh");

    expect(result.losses).toHaveLength(0);
  });

  test("Stop maps to post_cascade_response", () => {
    const settings = makeSettings({
      Stop: [
        {
          hooks: [{ type: "command", command: "/path/to/stop.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).toContain("post_cascade_response");
    const hook = parsed.hooks["post_cascade_response"]![0] as { command: string };
    expect(hook.command).toBe("/path/to/stop.sh");
    expect(result.losses).toHaveLength(0);
  });

  test("TaskCompleted maps to post_cascade_response", () => {
    const settings = makeSettings({
      TaskCompleted: [
        {
          hooks: [{ type: "command", command: "/path/to/task-done.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).toContain("post_cascade_response");
    const hook = parsed.hooks["post_cascade_response"]![0] as { command: string };
    expect(hook.command).toBe("/path/to/task-done.sh");
    expect(result.losses).toHaveLength(0);
  });

  test("Stop and TaskCompleted with same command deduplicate to single post_cascade_response entry", () => {
    const settings = makeSettings({
      Stop: [
        {
          hooks: [{ type: "command", command: "/shared/handler.sh" }],
        },
      ],
      TaskCompleted: [
        {
          hooks: [{ type: "command", command: "/shared/handler.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(parsed.hooks["post_cascade_response"]).toHaveLength(1);
    const hook = parsed.hooks["post_cascade_response"]![0] as { command: string };
    expect(hook.command).toBe("/shared/handler.sh");
  });

  test("Stop and TaskCompleted with different commands both appear in post_cascade_response", () => {
    const settings = makeSettings({
      Stop: [
        {
          hooks: [{ type: "command", command: "/stop-handler.sh" }],
        },
      ],
      TaskCompleted: [
        {
          hooks: [{ type: "command", command: "/task-handler.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(parsed.hooks["post_cascade_response"]).toHaveLength(2);
    const commands = (parsed.hooks["post_cascade_response"] as Array<{ command: string }>).map(
      (h) => h.command,
    );
    expect(commands).toContain("/stop-handler.sh");
    expect(commands).toContain("/task-handler.sh");
  });

  test("SessionStart produces a HookLoss and no output entry", () => {
    const settings = makeSettings({
      SessionStart: [
        {
          hooks: [{ type: "command", command: "/startup.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).not.toContain("SessionStart");
    expect(result.losses).toHaveLength(1);
    expect(result.losses[0]!.claudeEvent).toBe("SessionStart");
    expect(result.losses[0]!.reason.length).toBeGreaterThan(10);
  });

  test("SubagentStart produces a HookLoss and no output entry", () => {
    const settings = makeSettings({
      SubagentStart: [
        {
          matcher: ".*",
          hooks: [{ type: "command", command: "/subagent.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).not.toContain("SubagentStart");
    expect(result.losses).toHaveLength(1);
    expect(result.losses[0]!.claudeEvent).toBe("SubagentStart");
  });

  test("PostToolUse Edit|Write maps to post_write_code", () => {
    const settings = makeSettings({
      PostToolUse: [
        {
          matcher: "Edit|Write|MultiEdit",
          hooks: [{ type: "command", command: "/post-write.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).toContain("post_write_code");
    const hook = parsed.hooks["post_write_code"]![0] as { command: string };
    expect(hook.command).toBe("/post-write.sh");
  });

  test("PostToolUse Bash maps to post_run_command", () => {
    const settings = makeSettings({
      PostToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "/post-bash.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as { hooks: Record<string, unknown[]> };

    expect(Object.keys(parsed.hooks)).toContain("post_run_command");
    const hook = parsed.hooks["post_run_command"]![0] as { command: string };
    expect(hook.command).toBe("/post-bash.sh");
  });
});

// ============================================================================
// Warning Tests
// ============================================================================

describe("WindsurfHooksRenderer — warnings", () => {
  test("emits EXIT_CODE_SEMANTICS_CHANGED warning when any command hook is converted", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "/check.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const exitCodeWarning = result.warnings.find(
      (w) => w.code === "EXIT_CODE_SEMANTICS_CHANGED",
    );
    expect(exitCodeWarning).toBeDefined();
    expect(exitCodeWarning!.message).toContain("exit 2");
    expect(exitCodeWarning!.message).toContain("exit 1");
  });

  test("emits STDIN_FIELD_RENAME_REQUIRED warning when any command hook is converted", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command", command: "/check.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const stdinWarning = result.warnings.find(
      (w) => w.code === "STDIN_FIELD_RENAME_REQUIRED",
    );
    expect(stdinWarning).toBeDefined();
    expect(stdinWarning!.message).toContain("agent_action_name");
    expect(stdinWarning!.message).toContain("trajectory_id");
  });

  test("emits POST_HOOKS_ARE_ASYNC warning when Stop or TaskCompleted hooks are converted", () => {
    const settings = makeSettings({
      Stop: [
        {
          hooks: [{ type: "command", command: "/stop.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const asyncWarning = result.warnings.find(
      (w) => w.code === "POST_HOOKS_ARE_ASYNC",
    );
    expect(asyncWarning).toBeDefined();
    expect(asyncWarning!.message).toContain("post_cascade_response");
  });

  test("exit code and stdin warnings are not duplicated across multiple hooks", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [
            { type: "command", command: "/check1.sh" },
            { type: "command", command: "/check2.sh" },
          ],
        },
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command", command: "/edit-check.sh" }],
        },
      ],
    });

    const result = renderer.renderFromClaudeSettings(settings);
    const exitCodeWarnings = result.warnings.filter(
      (w) => w.code === "EXIT_CODE_SEMANTICS_CHANGED",
    );
    expect(exitCodeWarnings).toHaveLength(1);

    const stdinWarnings = result.warnings.filter(
      (w) => w.code === "STDIN_FIELD_RENAME_REQUIRED",
    );
    expect(stdinWarnings).toHaveLength(1);
  });
});

// ============================================================================
// Fidelity Score Tests
// ============================================================================

describe("WindsurfHooksRenderer — fidelity score", () => {
  test("perfect conversion (no losses, no warnings) scores 100", () => {
    // An empty hooks object converts perfectly
    const settings = makeSettings({});
    const result = renderer.renderFromClaudeSettings(settings);
    expect(result.losses).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.fidelityScore).toBe(100);
  });

  test("one loss reduces score by 10", () => {
    const settings = makeSettings({
      SessionStart: [
        { hooks: [{ type: "command", command: "/startup.sh" }] },
      ],
    });
    const result = renderer.renderFromClaudeSettings(settings);
    expect(result.losses).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
    expect(result.fidelityScore).toBe(90);
  });

  test("two losses reduce score by 20", () => {
    const settings = makeSettings({
      SessionStart: [
        { hooks: [{ type: "command", command: "/startup.sh" }] },
      ],
      SubagentStart: [
        { matcher: ".*", hooks: [{ type: "command", command: "/subagent.sh" }] },
      ],
    });
    const result = renderer.renderFromClaudeSettings(settings);
    expect(result.losses).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.fidelityScore).toBe(80);
  });

  test("warnings reduce score by 3 each", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "/check.sh" }],
        },
      ],
    });
    const result = renderer.renderFromClaudeSettings(settings);
    // Expect EXIT_CODE + STDIN_FIELD warnings (2), no post-hooks async
    // pre_run_command is a pre-hook, not post — so no POST_HOOKS_ARE_ASYNC
    const warningCount = result.warnings.length;
    expect(result.fidelityScore).toBe(100 - warningCount * 3);
  });

  test("fidelity score never goes below 0", () => {
    // Create a scenario with many losses and warnings
    const settings = makeSettings({
      SessionStart: [{ hooks: [{ command: "/a.sh" }] }],
      SubagentStart: [{ hooks: [{ command: "/b.sh" }] }],
      Stop: [{ hooks: [{ command: "/c.sh" }] }],
    });
    const result = renderer.renderFromClaudeSettings(settings);
    expect(result.fidelityScore).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Output Validity Tests
// ============================================================================

describe("WindsurfHooksRenderer — output validity", () => {
  test("output is valid JSON", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Edit|Write|Bash",
          hooks: [{ type: "command", command: "/multi.sh" }],
        },
      ],
      Stop: [
        { hooks: [{ command: "/stop.sh" }] },
      ],
    });
    const result = renderer.renderFromClaudeSettings(settings);
    // Should not throw
    const parsed = JSON.parse(result.hooksJson);
    expect(typeof parsed).toBe("object");
    expect(parsed).not.toBeNull();
  });

  test("output has a 'hooks' key at the root", () => {
    const settings = makeSettings({});
    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as Record<string, unknown>;
    expect("hooks" in parsed).toBe(true);
    expect(typeof parsed["hooks"]).toBe("object");
  });

  test("each hook entry has a command string", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "/safety.sh" }],
        },
      ],
    });
    const result = renderer.renderFromClaudeSettings(settings);
    const parsed = JSON.parse(result.hooksJson) as {
      hooks: Record<string, Array<{ command: string }>>;
    };

    for (const hooks of Object.values(parsed.hooks)) {
      for (const hook of hooks) {
        expect(typeof hook.command).toBe("string");
        expect(hook.command.length).toBeGreaterThan(0);
      }
    }
  });

  test("handles invalid JSON settings gracefully", () => {
    const result = renderer.renderFromClaudeSettings("{not valid json");
    expect(result.losses).toHaveLength(1);
    expect(result.losses[0]!.claudeEvent).toBe("(parse error)");
    expect(result.fidelityScore).toBe(0);
    // hooksJson is still valid JSON
    const parsed = JSON.parse(result.hooksJson);
    expect(typeof parsed).toBe("object");
  });
});

// ============================================================================
// Full ADT settings.json conversion test
// ============================================================================

describe("WindsurfHooksRenderer — full ADT settings.json conversion", () => {
  // Read the actual ADT settings.json
  const adtSettingsPath =
    "/Users/tonydeverill/businesses/repositories/agent-development-tools/hooks/settings.json";
  const adtSettingsJson = readFileSync(adtSettingsPath, "utf-8");

  test("conversion produces valid JSON output", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    const parsed = JSON.parse(result.hooksJson);
    expect(typeof parsed).toBe("object");
    expect("hooks" in (parsed as Record<string, unknown>)).toBe(true);
  });

  test("SessionStart hooks are recorded as losses", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    // ADT does not have SessionStart, but SubagentStart is present
    // Check that any unrepresentable events are recorded
    const parsed = JSON.parse(adtSettingsJson) as {
      hooks: Record<string, unknown>;
    };
    const unmappableEvents = ["SessionStart", "SubagentStart"].filter(
      (e) => e in parsed.hooks,
    );

    const lossEvents = result.losses.map((l) => l.claudeEvent);
    for (const event of unmappableEvents) {
      expect(lossEvents).toContain(event);
    }
  });

  test("SubagentStart is recorded as a loss when present in settings", () => {
    const parsed = JSON.parse(adtSettingsJson) as {
      hooks: Record<string, unknown>;
    };

    const result = renderer.renderFromClaudeSettings(adtSettingsJson);

    if ("SubagentStart" in parsed.hooks) {
      const subagentLoss = result.losses.find(
        (l) => l.claudeEvent === "SubagentStart",
      );
      expect(subagentLoss).toBeDefined();
      expect(subagentLoss!.reason.length).toBeGreaterThan(10);
    }
  });

  test("PreToolUse Bash hooks appear in pre_run_command", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    const parsed = JSON.parse(result.hooksJson) as {
      hooks: Record<string, Array<{ command: string }>>;
    };

    // ADT has PreToolUse Bash hooks (bash-safety.sh, pre-commit-safety.sh)
    expect(Object.keys(parsed.hooks)).toContain("pre_run_command");
    const commands = parsed.hooks["pre_run_command"]!.map((h) => h.command);
    // At least one command from the Bash matcher group
    expect(commands.length).toBeGreaterThan(0);
  });

  test("PreToolUse Edit|Write hooks appear in pre_write_code", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    const parsed = JSON.parse(result.hooksJson) as {
      hooks: Record<string, Array<{ command: string }>>;
    };

    expect(Object.keys(parsed.hooks)).toContain("pre_write_code");
    const commands = parsed.hooks["pre_write_code"]!.map((h) => h.command);
    expect(commands.length).toBeGreaterThan(0);
  });

  test("Stop and TaskCompleted hooks appear in post_cascade_response", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    const parsed = JSON.parse(result.hooksJson) as {
      hooks: Record<string, Array<{ command: string }>>;
    };

    expect(Object.keys(parsed.hooks)).toContain("post_cascade_response");
    expect(parsed.hooks["post_cascade_response"]!.length).toBeGreaterThan(0);
  });

  test("POST_HOOKS_ARE_ASYNC warning is present", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    const asyncWarning = result.warnings.find(
      (w) => w.code === "POST_HOOKS_ARE_ASYNC",
    );
    expect(asyncWarning).toBeDefined();
  });

  test("EXIT_CODE_SEMANTICS_CHANGED warning is present", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    const exitCodeWarning = result.warnings.find(
      (w) => w.code === "EXIT_CODE_SEMANTICS_CHANGED",
    );
    expect(exitCodeWarning).toBeDefined();
  });

  test("fidelity score is between 0 and 100 inclusive", () => {
    const result = renderer.renderFromClaudeSettings(adtSettingsJson);
    expect(result.fidelityScore).toBeGreaterThanOrEqual(0);
    expect(result.fidelityScore).toBeLessThanOrEqual(100);
  });

  test("fidelity score for ADT settings is deterministic across two runs", () => {
    const r1 = renderer.renderFromClaudeSettings(adtSettingsJson);
    const r2 = renderer.renderFromClaudeSettings(adtSettingsJson);
    expect(r1.fidelityScore).toBe(r2.fidelityScore);
    expect(r1.losses).toHaveLength(r2.losses.length);
    expect(r1.warnings).toHaveLength(r2.warnings.length);
  });
});

// ============================================================================
// WindsurfHooksParser Tests
// ============================================================================

describe("parseWindsurfHooks — parser", () => {
  test("parses a valid hooks.json", () => {
    const input = JSON.stringify({
      hooks: {
        pre_write_code: [
          { command: "python3 /path/to/check.py", show_output: true },
        ],
        pre_run_command: [
          { command: "/path/to/cmd-check.sh" },
        ],
      },
    });

    const result = parseWindsurfHooks(input);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.spec).toBeDefined();

    const spec = result.spec as WindsurfHooksSpec;
    expect(Object.keys(spec.hooks)).toContain("pre_write_code");
    expect(Object.keys(spec.hooks)).toContain("pre_run_command");

    expect(spec.hooks["pre_write_code"]).toHaveLength(1);
    expect(spec.hooks["pre_write_code"]![0]!.command).toBe(
      "python3 /path/to/check.py",
    );
    expect(spec.hooks["pre_write_code"]![0]!.show_output).toBe(true);

    expect(spec.hooks["pre_run_command"]![0]!.command).toBe(
      "/path/to/cmd-check.sh",
    );
  });

  test("returns error for invalid JSON", () => {
    const result = parseWindsurfHooks("{bad json}");
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.spec).toBeUndefined();
  });

  test("returns error when 'hooks' key is missing", () => {
    const result = parseWindsurfHooks(JSON.stringify({ other: {} }));
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("hooks");
  });

  test("returns error when hooks value is not an object", () => {
    const result = parseWindsurfHooks(JSON.stringify({ hooks: [] }));
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("returns error when a hook is missing 'command'", () => {
    const result = parseWindsurfHooks(
      JSON.stringify({
        hooks: {
          pre_write_code: [{ show_output: true }],
        },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("command");
  });

  test("warns on unknown Windsurf event names", () => {
    const result = parseWindsurfHooks(
      JSON.stringify({
        hooks: {
          some_future_event: [{ command: "/path/to/script.sh" }],
        },
      }),
    );
    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("some_future_event");
  });

  test("parses optional fields show_output and working_directory", () => {
    const result = parseWindsurfHooks(
      JSON.stringify({
        hooks: {
          pre_write_code: [
            {
              command: "/check.sh",
              show_output: false,
              working_directory: "/tmp",
            },
          ],
        },
      }),
    );
    expect(result.success).toBe(true);
    const hook = result.spec!.hooks["pre_write_code"]![0]!;
    expect(hook.show_output).toBe(false);
    expect(hook.working_directory).toBe("/tmp");
  });

  test("round-trip: renderer output is parseable by parser", () => {
    const settings = makeSettings({
      PreToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command", command: "/check.sh" }],
        },
      ],
      Stop: [
        { hooks: [{ command: "/stop.sh" }] },
      ],
    });

    const renderResult = renderer.renderFromClaudeSettings(settings);
    const parseResult = parseWindsurfHooks(renderResult.hooksJson);

    expect(parseResult.success).toBe(true);
    expect(parseResult.errors).toHaveLength(0);
    expect(Object.keys(parseResult.spec!.hooks)).toContain("pre_write_code");
    expect(Object.keys(parseResult.spec!.hooks)).toContain("post_cascade_response");
  });
});
