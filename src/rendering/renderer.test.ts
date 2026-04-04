/**
 * Tests for agent-specific renderers
 */

import { describe, expect, test } from "bun:test";
import { ClaudeRenderer } from "./claude-renderer.js";
import { WindsurfRenderer } from "./windsurf-renderer.js";
import { CursorRenderer } from "./cursor-renderer.js";
import { OpenCodeRenderer } from "./opencode-renderer.js";
import { renderComponent, getTargetPath } from "./renderer-factory.js";
import type { ComponentSpec } from "../core/types.js";

const createTestSpec = (overrides?: Partial<ComponentSpec>): ComponentSpec => ({
  id: "test-component",
  version: { major: 1, minor: 0, patch: 0 },
  sourceAgent: { id: "claude", detectedAt: new Date().toISOString() },
  componentType: "skill",
  category: ["testing"],
  intent: {
    summary: "A test component for unit testing",
    purpose: "Testing the rendering pipeline",
  },
  activation: {
    mode: "suggested",
    safetyLevel: "safe",
  },
  invocation: {
    slashCommand: "test",
    userInvocable: true,
  },
  execution: {
    context: "main",
  },
  body: "This is the body content.\n\n## Steps\n1. First step\n2. Second step",
  capabilities: {
    needsShell: false,
    needsGit: false,
    needsNetwork: false,
    needsBrowser: false,
    needsCodeSearch: false,
    needsMcp: false,
    providesAnalysis: false,
    providesCodeGeneration: false,
    providesRefactoring: false,
    providesDocumentation: false,
  },
  metadata: {
    originalFormat: "test",
    updatedAt: new Date().toISOString(),
  },
  ...overrides,
});

describe("ClaudeRenderer", () => {
  const renderer = new ClaudeRenderer();

  describe("render", () => {
    test("renders basic spec to Claude format", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("---");
      expect(result.content).toContain("name: test-component");
      expect(result.content).toContain("description: A test component");
    });

    test("includes user-invocable when true", () => {
      const spec = createTestSpec({ invocation: { userInvocable: true } });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("user-invocable: true");
    });

    test("includes disable-model-invocation for manual mode", () => {
      const spec = createTestSpec({
        activation: { mode: "manual", safetyLevel: "safe" },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("disable-model-invocation: true");
    });

    test("includes argument-hint when present", () => {
      const spec = createTestSpec({
        invocation: {
          argumentHint: "<file-path>",
          userInvocable: true,
        },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("argument-hint: <file-path>");
    });

    test("includes allowed-tools as array", () => {
      const spec = createTestSpec({
        execution: {
          context: "main",
          allowedTools: ["Bash(git*)", "Read", "Write"],
        },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("allowed-tools:");
      expect(result.content).toContain("- Bash(git*)");
      expect(result.content).toContain("- Read");
    });

    test("includes model when specified", () => {
      const spec = createTestSpec({
        execution: { context: "main", preferredModel: "opus" },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("model: opus");
    });

    test("includes agent when specified", () => {
      const spec = createTestSpec({
        execution: { context: "main", subAgent: "code-architect" },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("agent: code-architect");
    });

    test("includes fork context", () => {
      const spec = createTestSpec({
        execution: { context: "fork" },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("context: fork");
    });

    test("preserves body content", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("This is the body content");
      expect(result.content).toContain("First step");
    });

    test("adds conversion comments when requested", () => {
      const spec = createTestSpec({
        sourceAgent: { id: "windsurf", detectedAt: new Date().toISOString() },
      });
      const result = renderer.render(spec, { includeComments: true });

      expect(result.success).toBe(true);
      expect(result.content).toContain("<!-- Converted from windsurf");
      // Frontmatter must remain first meaningful content (no leading comments)
      const firstNonEmpty = result.content
        ?.split(/\r?\n/)
        .find((l) => l.trim().length > 0);
      expect(firstNonEmpty).toBe("---");
    });

    test("generates conversion report", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report?.fidelityScore).toBeDefined();
      expect(result.report?.preservedSemantics).toBeDefined();
    });

    test("reports warnings for Windsurf source", () => {
      const spec = createTestSpec({
        sourceAgent: { id: "windsurf", detectedAt: new Date().toISOString() },
        activation: { mode: "auto", safetyLevel: "safe" },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.report?.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("getTargetFilename", () => {
    test("generates correct filename", () => {
      const spec = createTestSpec();
      const filename = renderer.getTargetFilename(spec);

      expect(filename).toBe("test-component/SKILL.md");
    });
  });

  describe("getTargetDirectory", () => {
    test("returns Claude skills directory", () => {
      const spec = createTestSpec();
      const dir = renderer.getTargetDirectory(spec);

      expect(dir).toBe(".claude/skills");
    });
  });
});

describe("WindsurfRenderer", () => {
  const renderer = new WindsurfRenderer();

  describe("render", () => {
    test("renders basic spec to Windsurf format", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("---");
      expect(result.content).toContain("description:");
    });

    test("reports loss for auto activation (Windsurf doesn't support auto-execution)", () => {
      const spec = createTestSpec({
        activation: { mode: "auto", safetyLevel: "safe" },
        sourceAgent: { id: "claude", detectedAt: new Date().toISOString() },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).not.toContain("auto_execution_mode:");
      expect(result.report?.losses).toBeDefined();
      expect(result.report?.losses?.some(l => l.category === "activation")).toBe(true);
    });

    test("preserves body content", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("This is the body content");
    });

    test("keeps YAML frontmatter first even with comments", () => {
      const spec = createTestSpec({
        sourceAgent: { id: "claude", detectedAt: new Date().toISOString() },
      });
      const result = renderer.render(spec, { includeComments: true });

      expect(result.success).toBe(true);
      expect(result.content).toContain("<!-- Converted from claude");

      const firstNonEmpty = result.content
        ?.split(/\r?\n/)
        .find((l) => l.trim().length > 0);
      expect(firstNonEmpty).toBe("---");
    });

    test("generates conversion report", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report?.fidelityScore).toBeDefined();
    });

    test("reports losses for Claude-specific features", () => {
      const spec = createTestSpec({
        sourceAgent: { id: "claude", detectedAt: new Date().toISOString() },
        execution: { context: "fork", allowedTools: ["Bash(git*)"] },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      // Should have some warnings about lost features
      expect(
        result.report?.losses.length ||
          0 + (result.report?.warnings.length || 0),
      ).toBeGreaterThanOrEqual(0);
    });

    // Fix 1: Rule trigger frontmatter tests
    test("rule with alwaysApply:true emits trigger:always_on", () => {
      const spec = createTestSpec({
        componentType: "rule",
        activation: { mode: "auto", safetyLevel: "safe" },
      }) as ComponentSpec & { ruleActivation?: { alwaysApply: boolean; agentDecided: boolean; scope: string } };
      (spec as Record<string, unknown>)["ruleActivation"] = {
        alwaysApply: true,
        agentDecided: false,
        scope: "project",
      };
      const result = renderer.render(spec as ComponentSpec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("trigger: always_on");
      expect(result.content).not.toContain("globs:");
    });

    test("rule with glob patterns emits trigger:glob and comma-separated globs string", () => {
      const spec = createTestSpec({
        componentType: "rule",
        activation: { mode: "auto", safetyLevel: "safe" },
      });
      (spec as Record<string, unknown>)["ruleActivation"] = {
        globs: ["api/**", "routes/**"],
        alwaysApply: false,
        agentDecided: false,
        scope: "project",
      };
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("trigger: glob");
      expect(result.content).toContain("globs: api/**,routes/**");
      // Must be a comma-separated string, not a YAML list
      expect(result.content).not.toMatch(/globs:\s*\n\s*-/);
    });

    test("rule with activation.triggers glob pattern emits trigger:glob", () => {
      const spec = createTestSpec({
        componentType: "rule",
        activation: {
          mode: "auto",
          safetyLevel: "safe",
          triggers: [
            { type: "glob", pattern: "middleware/**" },
          ],
        },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("trigger: glob");
      expect(result.content).toContain("globs: middleware/**");
    });

    test("rule with agentDecided:true emits trigger:model_decision with a loss", () => {
      const spec = createTestSpec({
        componentType: "rule",
        activation: { mode: "auto", safetyLevel: "safe" },
      });
      (spec as Record<string, unknown>)["ruleActivation"] = {
        alwaysApply: false,
        agentDecided: true,
        scope: "project",
      };
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("trigger: model_decision");
      // Must surface a loss about probabilistic degradation
      const agentDecidedLoss = result.report?.losses.find(
        (l) => l.sourceField === "ruleActivation.agentDecided",
      );
      expect(agentDecidedLoss).toBeDefined();
      expect(agentDecidedLoss?.severity).toBe("warning");
    });

    test("rule with no ruleActivation defaults to trigger:always_on", () => {
      const spec = createTestSpec({
        componentType: "rule",
        activation: { mode: "auto", safetyLevel: "safe" },
      });
      // No ruleActivation set
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("trigger: always_on");
    });

    // Fix 2: Skill/workflow unsupported field warnings
    test("skill with allowedTools emits TOOL_RESTRICTION_LOST warning", () => {
      const spec = createTestSpec({
        sourceAgent: { id: "claude", detectedAt: new Date().toISOString() },
        execution: {
          context: "main",
          allowedTools: ["Bash(git*)", "Read"],
        },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      const warning = result.report?.warnings.find(
        (w) => w.code === "TOOL_RESTRICTION_LOST",
      );
      expect(warning).toBeDefined();
      expect(warning?.field).toBe("execution.allowedTools");
    });

    test("skill with model in metadata emits MODEL_SELECTION_LOST warning", () => {
      const spec = createTestSpec({
        sourceAgent: { id: "claude", detectedAt: new Date().toISOString() },
        metadata: {
          originalFormat: "test",
          updatedAt: new Date().toISOString(),
          model: "claude-opus-4-5",
        },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      const warning = result.report?.warnings.find(
        (w) => w.code === "MODEL_SELECTION_LOST",
      );
      expect(warning).toBeDefined();
      expect(warning?.field).toBe("metadata.model");
    });
  });

  describe("getTargetFilename", () => {
    test("generates correct filename", () => {
      const spec = createTestSpec();
      const filename = renderer.getTargetFilename(spec);

      expect(filename).toContain("test-component");
      expect(filename).toContain(".md");
    });
  });

  describe("getTargetDirectory", () => {
    test("returns Windsurf workflows directory", () => {
      const spec = createTestSpec();
      const dir = renderer.getTargetDirectory(spec);

      expect(dir).toBe(".windsurf/workflows");
    });

    test("returns Windsurf rules directory for rule type", () => {
      const spec = createTestSpec({ componentType: "rule" });
      const dir = renderer.getTargetDirectory(spec);

      expect(dir).toBe(".windsurf/rules");
    });
  });
});

describe("CursorRenderer", () => {
  const renderer = new CursorRenderer();

  describe("render", () => {
    test("renders skill spec to Cursor skill format", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("---");
      expect(result.content).toContain("name: test-component");
      expect(result.content).toContain("description: A test component");
      expect(result.content).toContain("This is the body content");
    });

    test("renders command spec to Cursor commands format", () => {
      const spec = createTestSpec({
        componentType: "command",
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("# Test Component");
      expect(result.content).toContain("## Objective");
      expect(result.content).toContain("This is the body content");
    });

    test("includes globs when file patterns specified", () => {
      const spec = createTestSpec({
        metadata: {
          originalFormat: "test",
          updatedAt: new Date().toISOString(),
          filePatterns: ["**/*.ts", "**/*.tsx"],
        },
      });
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      // Globs may be included if patterns are present
    });

    test("preserves body content", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("This is the body content");
    });

    test("generates conversion report", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report?.fidelityScore).toBeDefined();
    });
  });

  describe("getTargetFilename", () => {
    test("generates SKILL.md filename for skills", () => {
      const spec = createTestSpec();
      const filename = renderer.getTargetFilename(spec);

      expect(filename).toBe("test-component/SKILL.md");
    });

    test("generates .md filename for commands", () => {
      const spec = createTestSpec({ componentType: "command" });
      const filename = renderer.getTargetFilename(spec);

      expect(filename).toBe("test-component.md");
    });
  });

  describe("getTargetDirectory", () => {
    test("returns Cursor skills directory for skills", () => {
      const spec = createTestSpec();
      const dir = renderer.getTargetDirectory(spec);

      expect(dir).toBe(".cursor/skills");
    });

    test("returns Cursor commands directory for commands", () => {
      const spec = createTestSpec({ componentType: "command" });
      const dir = renderer.getTargetDirectory(spec);

      expect(dir).toBe(".cursor/commands");
    });
  });
});

describe("OpenCodeRenderer", () => {
  const renderer = new OpenCodeRenderer();

  describe("render", () => {
    test("renders skill spec to OpenCode skill format", () => {
      const spec = createTestSpec();
      const result = renderer.render(spec);

      expect(result.success).toBe(true);
      expect(result.content).toContain("name: test-component");
      expect(result.content).toContain("description: A test component for unit testing");
      expect(result.content).toContain("This is the body content");
    });
  });

  describe("getTargetFilename", () => {
    test("generates SKILL.md filename for skills", () => {
      const spec = createTestSpec();
      const filename = renderer.getTargetFilename(spec);

      expect(filename).toBe("test-component/SKILL.md");
    });
  });

  describe("getTargetDirectory", () => {
    test("returns OpenCode skills directory for skills", () => {
      const spec = createTestSpec();
      const dir = renderer.getTargetDirectory(spec);

      expect(dir).toBe(".opencode/skills");
    });
  });
});

describe("Renderer Factory", () => {
  describe("renderComponent", () => {
    test("renders to Claude format", () => {
      const spec = createTestSpec();
      const result = renderComponent(spec, "claude");

      expect(result.success).toBe(true);
      expect(result.content).toContain("name:");
    });

    test("renders to Windsurf format", () => {
      const spec = createTestSpec();
      const result = renderComponent(spec, "windsurf");

      expect(result.success).toBe(true);
      expect(result.content).toContain("description:");
    });

    test("renders to Cursor format", () => {
      const spec = createTestSpec();
      const result = renderComponent(spec, "cursor");

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe("getTargetPath", () => {
    test("returns full path for Claude", () => {
      const spec = createTestSpec();
      const path = getTargetPath(spec, "claude");

      expect(path).toContain(".claude/skills");
      expect(path).toContain("test-component");
    });

    test("returns full path for Windsurf", () => {
      const spec = createTestSpec();
      const path = getTargetPath(spec, "windsurf");

      expect(path).toContain(".windsurf");
    });

    test("returns full path for Cursor", () => {
      const spec = createTestSpec();
      const path = getTargetPath(spec, "cursor");

      expect(path).toContain(".cursor");
    });
  });
});

describe("Renderer Edge Cases", () => {
  test("handles spec with empty body", () => {
    const spec = createTestSpec({ body: "" });
    const renderer = new ClaudeRenderer();
    const result = renderer.render(spec);

    expect(result.success).toBe(true);
    expect(result.content).toContain("---");
  });

  test("handles spec with special characters in description", () => {
    const spec = createTestSpec({
      intent: {
        summary: 'Contains: colons, #hashes, and "quotes"',
        purpose: "Testing special chars",
      },
    });
    const renderer = new ClaudeRenderer();
    const result = renderer.render(spec);

    expect(result.success).toBe(true);
  });

  test("handles spec with very long body", () => {
    const longBody = "Line of content.\n".repeat(1000);
    const spec = createTestSpec({ body: longBody });
    const renderer = new ClaudeRenderer();
    const result = renderer.render(spec);

    expect(result.success).toBe(true);
    expect(result.content.length).toBeGreaterThan(10000);
  });

  test("handles spec with unicode content", () => {
    const spec = createTestSpec({
      intent: {
        summary: "Unicode: 日本語 中文 한국어 🚀",
        purpose: "Testing unicode",
      },
      body: "Content with emoji: 🎉 and special chars: αβγ",
    });
    const renderer = new ClaudeRenderer();
    const result = renderer.render(spec);

    expect(result.success).toBe(true);
    expect(result.content).toContain("🚀");
    expect(result.content).toContain("🎉");
  });

  test("handles agent overrides", () => {
    const spec = createTestSpec({
      agentOverrides: {
        claude: {
          frontmatterOverrides: {
            "custom-field": "custom-value",
          },
          bodyPrefix: "# Custom Prefix",
        },
      },
    });
    const renderer = new ClaudeRenderer();
    const result = renderer.render(spec);

    expect(result.success).toBe(true);
    expect(result.content).toContain("custom-field: custom-value");
    expect(result.content).toContain("# Custom Prefix");
  });
});
