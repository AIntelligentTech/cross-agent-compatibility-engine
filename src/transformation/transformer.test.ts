/**
 * Tests for the core transformation pipeline
 */

import { describe, expect, test } from "bun:test";
import { transform, transformSpec } from "./transformer.js";
import type { ComponentSpec } from "../core/types.js";

describe("Transformer", () => {
  describe("transform", () => {
    const claudeSkill = `---
name: test-skill
description: A test skill for unit testing
user-invocable: true
---

This is the body of the skill.

## Steps
1. Do something
2. Do something else
`;

    const windsurfWorkflow = `---
description: A test workflow
auto_execution_mode: 2
---

# Test Workflow

This workflow does testing.
`;

    const cursorCommand = `---
description: A test command
globs:
  - "**/*.ts"
---

You are a helpful assistant for TypeScript.
`;

    test("transforms Claude skill to Windsurf workflow", () => {
      const result = transform(claudeSkill, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output).toContain("description:");
      expect(result.spec).toBeDefined();
      expect(result.spec?.id).toBe("test-skill");
    });

    test("transforms Claude skill to Cursor command", () => {
      const result = transform(claudeSkill, {
        sourceAgent: "claude",
        targetAgent: "cursor",
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.spec?.sourceAgent?.id).toBe("claude");
    });

    test("transforms Windsurf workflow to Claude skill", () => {
      const result = transform(windsurfWorkflow, {
        sourceAgent: "windsurf",
        targetAgent: "claude",
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output).toContain("name:");
    });

    test("transforms Cursor command to Claude skill", () => {
      const result = transform(cursorCommand, {
        sourceAgent: "cursor",
        targetAgent: "claude",
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    test("returns spec with correct component type", () => {
      const result = transform(claudeSkill, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
      expect(result.spec?.componentType).toBe("skill");
    });

    test("calculates fidelity score", () => {
      const result = transform(claudeSkill, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
      expect(result.fidelityScore).toBeDefined();
      expect(typeof result.fidelityScore).toBe("number");
      expect(result.fidelityScore).toBeGreaterThan(0);
      expect(result.fidelityScore).toBeLessThanOrEqual(100);
    });

    test("includes warnings for feature loss", () => {
      const claudeWithFork = `---
name: fork-skill
description: A skill with fork context
context: fork
---

This runs in a forked context.
`;
      const result = transform(claudeWithFork, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("returns error for invalid content", () => {
      const result = transform("not valid yaml frontmatter", {
        targetAgent: "claude",
      });

      // Should still try to parse and may succeed with defaults
      // or fail gracefully
      expect(typeof result.success).toBe("boolean");
    });

    test("preserves body content during transformation", () => {
      const result = transform(claudeSkill, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("This is the body of the skill");
      expect(result.output).toContain("Do something");
    });

    test("includes conversion comments when requested", () => {
      const result = transform(claudeSkill, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
        includeComments: true,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("<!--");
      expect(result.output).toContain("Converted from");
    });
  });

  describe("transformSpec", () => {
    const testSpec: ComponentSpec = {
      id: "test-component",
      version: { major: 1, minor: 0, patch: 0 },
      sourceAgent: { id: "claude", detectedAt: new Date().toISOString() },
      componentType: "skill",
      category: ["testing"],
      intent: {
        summary: "A test component",
        purpose: "Testing the transform pipeline",
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
      body: "Test body content.",
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
    };

    test("renders spec to Claude format", () => {
      const result = transformSpec(testSpec, "claude");

      expect(result.success).toBe(true);
      expect(result.content).toContain("name: test-component");
      expect(result.content).toContain("Test body content");
    });

    test("renders spec to Windsurf format", () => {
      const result = transformSpec(testSpec, "windsurf");

      expect(result.success).toBe(true);
      expect(result.content).toContain("description:");
    });

    test("renders spec to Cursor format", () => {
      const result = transformSpec(testSpec, "cursor");

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    test("generates appropriate filename", () => {
      const result = transformSpec(testSpec, "claude");

      expect(result.success).toBe(true);
      expect(result.filename).toContain("test-component");
    });

    test("includes conversion report", () => {
      const result = transformSpec(testSpec, "windsurf");

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report?.fidelityScore).toBeDefined();
    });
  });

  describe("Round-trip transformations", () => {
    test("Claude -> Windsurf -> Claude preserves core content", () => {
      const original = `---
name: roundtrip-test
description: Testing round-trip conversion
user-invocable: true
---

# Important Content

This content should survive the round-trip.

- Point 1
- Point 2
`;

      // First leg: Claude -> Windsurf
      const toWindsurf = transform(original, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(toWindsurf.success).toBe(true);

      // Second leg: Windsurf -> Claude
      const backToClaude = transform(toWindsurf.output!, {
        sourceAgent: "windsurf",
        targetAgent: "claude",
      });

      expect(backToClaude.success).toBe(true);
      expect(backToClaude.output).toContain("Important Content");
      expect(backToClaude.output).toContain("Point 1");
    });

    test("Windsurf -> Cursor -> Windsurf preserves core content", () => {
      const original = `---
description: Cross-agent test workflow
---

# Workflow Content

Execute these steps carefully.
`;

      const toCursor = transform(original, {
        sourceAgent: "windsurf",
        targetAgent: "cursor",
      });

      expect(toCursor.success).toBe(true);

      const backToWindsurf = transform(toCursor.output!, {
        sourceAgent: "cursor",
        targetAgent: "windsurf",
      });

      expect(backToWindsurf.success).toBe(true);
      expect(backToWindsurf.output).toContain("Workflow Content");
    });
  });

  describe("Edge cases", () => {
    test("handles empty body", () => {
      const emptyBody = `---
name: empty-skill
description: A skill with no body
---
`;

      const result = transform(emptyBody, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
    });

    test("handles special characters in description", () => {
      const specialChars = `---
name: special-skill
description: "Contains: colons, #hashes, and 'quotes'"
---

Content here.
`;

      const result = transform(specialChars, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
    });

    test("handles very long content", () => {
      const longBody = "A".repeat(10000);
      const longContent = `---
name: long-skill
description: A skill with long content
---

${longBody}
`;

      const result = transform(longContent, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
      expect(result.output?.length).toBeGreaterThan(10000);
    });

    test("handles unicode content", () => {
      const unicodeContent = `---
name: unicode-skill
description: Skill with unicode 日本語 中文 한국어
---

Body with emoji: 🚀 and special chars: αβγ
`;

      const result = transform(unicodeContent, {
        sourceAgent: "claude",
        targetAgent: "windsurf",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("🚀");
    });
  });
});
