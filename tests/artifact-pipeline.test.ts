import { describe, expect, test } from "bun:test";
import { parseComponent } from "../src/parsing/parser-factory.js";
import { getTargetPath, renderComponent } from "../src/rendering/renderer-factory.js";
import { getArtifactCompatibilityScore } from "../src/transformation/capability-mapper.js";
import { validate } from "../src/validation/index.js";

const claudeSettings = JSON.stringify(
  {
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "./pre.sh" }],
        },
      ],
      Stop: [
        {
          hooks: [{ type: "command", command: "./stop.sh" }],
        },
      ],
    },
  },
  null,
  2,
);

const windsurfHooks = JSON.stringify(
  {
    hooks: {
      pre_run_command: [
        {
          command: "./pre.sh",
          working_directory: "/tmp/project",
        },
      ],
      post_cascade_response: [
        {
          command: "./stop.sh",
        },
      ],
    },
  },
  null,
  2,
);

const claudeMemory = `# CLAUDE

Use @docs/guide.md before editing.

## Standards

Always verify changes.
`;

const claudeSkillWithCustomMetadata = `---
name: custom-skill
description: Has custom metadata
custom-mode: strict
---

Do work.
`;

describe("Artifact-aware pipeline", () => {
  test("parses Claude settings.json hooks through the main parser", () => {
    const result = parseComponent(claudeSettings, {
      sourceFile: "/tmp/project/.claude/settings.json",
    });

    expect(result.success).toBe(true);
    expect(result.spec?.componentType).toBe("hook");
    expect(result.spec?.hooks).toHaveLength(2);
    expect(result.spec?.metadata.rawConfig?.hooks).toBeDefined();
    expect(result.spec?.hooks?.some((hook) => hook.event === "PreToolUse" && hook.matcher === "Bash")).toBe(true);
  });

  test("renders Claude hook specs to Windsurf hooks.json through the main renderer", () => {
    const parseResult = parseComponent(claudeSettings, {
      sourceFile: "/tmp/project/.claude/settings.json",
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.spec).toBeDefined();

    const renderResult = renderComponent(parseResult.spec!, "windsurf");
    expect(renderResult.success).toBe(true);
    expect(getTargetPath(parseResult.spec!, "windsurf")).toBe(".windsurf/hooks.json");

    const parsedOutput = JSON.parse(renderResult.content ?? "{}") as {
      hooks: Record<string, Array<{ command: string }>>;
    };

    expect(parsedOutput.hooks.pre_run_command?.[0]?.command).toBe("./pre.sh");
    expect(parsedOutput.hooks.post_cascade_response?.[0]?.command).toBe("./stop.sh");
    const warningCodes = renderResult.report?.warnings.map((warning) => warning.code) ?? [];
    expect(warningCodes).toContain("EXIT_CODE_SEMANTICS_CHANGED");
  });

  test("parses Windsurf hooks.json through the main parser and preserves working_directory", () => {
    const result = parseComponent(windsurfHooks, {
      sourceFile: "/tmp/project/.windsurf/hooks.json",
    });

    expect(result.success).toBe(true);
    expect(result.spec?.componentType).toBe("hook");
    const preRunHook = result.spec?.hooks?.find((hook) => hook.event === "pre_run_command");
    expect(preRunHook?.workingDirectory).toBe("/tmp/project");
  });

  test("renders Windsurf hook specs back to Claude settings.json", () => {
    const parseResult = parseComponent(windsurfHooks, {
      sourceFile: "/tmp/project/.windsurf/hooks.json",
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.spec).toBeDefined();

    const renderResult = renderComponent(parseResult.spec!, "claude");
    expect(renderResult.success).toBe(true);
    expect(getTargetPath(parseResult.spec!, "claude")).toBe(".claude/settings.json");

    const parsedOutput = JSON.parse(renderResult.content ?? "{}") as {
      hooks: Record<string, Array<{ matcher?: string; hooks: Array<{ command: string }> }>>;
    };

    expect(parsedOutput.hooks.PreToolUse?.[0]?.hooks?.[0]?.command).toBe("./pre.sh");
    expect(parsedOutput.hooks.Stop?.[0]?.hooks?.[0]?.command).toBe("./stop.sh");
  });

  test("routes CLAUDE.md memory files through the main parser", () => {
    const result = parseComponent(claudeMemory, {
      sourceFile: "/tmp/project/CLAUDE.md",
    });

    expect(result.success).toBe(true);
    expect(result.spec?.componentType).toBe("memory");
    expect(result.spec?.memorySpec?.imports).toHaveLength(1);
    expect(result.spec?.metadata.sourceDirectory).toBe("/tmp/project");
  });

  test("preserves unknown Claude frontmatter fields on round-trip render", () => {
    const parseResult = parseComponent(claudeSkillWithCustomMetadata, {
      sourceFile: "/tmp/project/.claude/skills/custom-skill/SKILL.md",
    });

    expect(parseResult.success).toBe(true);
    expect(parseResult.spec?.metadata.customFields?.["custom-mode"]).toBe("strict");

    const renderResult = renderComponent(parseResult.spec!, "claude");
    expect(renderResult.success).toBe(true);
    expect(renderResult.content).toContain("custom-mode: strict");
  });

  test("reports artifact-aware compatibility scores", () => {
    expect(getArtifactCompatibilityScore("claude", "windsurf", "hook")).toBeGreaterThan(0);
    expect(getArtifactCompatibilityScore("claude", "cursor", "hook")).toBe(0);
    expect(getArtifactCompatibilityScore("universal", "gemini", "memory")).toBeGreaterThan(0);
  });

  test("validates Claude and Windsurf hook config files as JSON artifacts", () => {
    const claudeValidation = validate(claudeSettings, "claude", "hook");
    const windsurfValidation = validate(windsurfHooks, "windsurf", "hook");
    const invalidValidation = validate("{}", "claude", "hook");

    expect(claudeValidation.valid).toBe(true);
    expect(windsurfValidation.valid).toBe(true);
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.issues.some((issue) => issue.code === "MISSING_HOOKS")).toBe(true);
  });
});
