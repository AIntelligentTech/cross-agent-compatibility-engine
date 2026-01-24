/**
 * Tests for version adaptation
 */

import { describe, expect, test } from "bun:test";
import {
  adaptVersion,
  needsAdaptation,
  getDefaultTargetVersion,
} from "./version-adapter.js";

describe("Version Adapter", () => {
  describe("needsAdaptation", () => {
    test("returns false for same version", () => {
      expect(needsAdaptation("claude", "1.0", "1.0")).toBe(false);
    });

    test("returns true when breaking changes exist", () => {
      expect(needsAdaptation("claude", "1.0", "2.0")).toBe(true);
    });

    test("returns false when no breaking changes", () => {
      expect(needsAdaptation("windsurf", "wave-1", "wave-8")).toBe(false);
    });

    test("returns true for Cursor rules migration", () => {
      expect(needsAdaptation("cursor", "0.34", "1.7")).toBe(true);
    });
  });

  describe("getDefaultTargetVersion", () => {
    test("returns current Claude version", () => {
      expect(getDefaultTargetVersion("claude")).toBe("2.0");
    });

    test("returns current Windsurf version", () => {
      expect(getDefaultTargetVersion("windsurf")).toBe("wave-13");
    });

    test("returns current Cursor version", () => {
      expect(getDefaultTargetVersion("cursor")).toBe("2.3");
    });

    test("returns fallback for unknown agent", () => {
      expect(getDefaultTargetVersion("gemini")).toBe("1.0");
    });
  });

  describe("adaptVersion", () => {
    describe("Claude adaptations", () => {
      test("adds model default when agent present but model missing", () => {
        const content = `---
name: my-skill
agent: code-architect
---

Content here.
`;
        const result = adaptVersion("claude", content, "1.0", "1.5");
        expect(result.content).toContain("model:");
        expect(result.transformations.length).toBeGreaterThan(0);
      });

      test("preserves existing model when present", () => {
        const content = `---
name: my-skill
agent: code-architect
model: opus
---

Content here.
`;
        const result = adaptVersion("claude", content, "1.0", "1.5");
        expect(result.content).toContain("model: opus");
      });

      test("warns about rules location for 2.0 upgrade", () => {
        const content = `---
name: my-skill
---

Some rules here.
`;
        const result = adaptVersion("claude", content, "1.0", "2.0");
        expect(result.hasBreakingChanges).toBe(true);
      });
    });

    describe("Windsurf adaptations", () => {
      test("adds auto_execution_mode when upgrading to wave-8+", () => {
        const content = `---
description: My workflow
---

Content here.
`;
        const result = adaptVersion("windsurf", content, "wave-1", "wave-8");
        expect(result.content).toContain("auto_execution_mode:");
        expect(result.transformations.length).toBeGreaterThan(0);
      });

      test("preserves existing auto_execution_mode", () => {
        const content = `---
description: My workflow
auto_execution_mode: 2
---

Content here.
`;
        const result = adaptVersion("windsurf", content, "wave-1", "wave-8");
        expect(result.content).toContain("auto_execution_mode: 2");
      });
    });

    describe("Cursor adaptations", () => {
      test("adds MDC metadata when upgrading to 1.7+", () => {
        const content = `---
title: My Rule
---

Rule content.
`;
        const result = adaptVersion("cursor", content, "1.6", "1.7");
        expect(result.transformations.length).toBeGreaterThan(0);
      });

      test("migrates .cursorrules format", () => {
        // Plain content without frontmatter
        const content = "You are a helpful assistant.";
        const result = adaptVersion("cursor", content, "0.34", "1.7");
        expect(result.hasBreakingChanges).toBe(true);
      });
    });

    describe("Downgrade warnings", () => {
      test("warns when downgrading Claude with agent field", () => {
        const content = `---
name: my-skill
agent: code-architect
model: opus
---

Content here.
`;
        const result = adaptVersion("claude", content, "1.5", "1.0");
        expect(result.warnings.length).toBeGreaterThan(0);
        // Check for any warning about unsupported fields in earlier versions
        expect(
          result.warnings.some(
            (w) =>
              w.includes("agent") ||
              w.includes("1.5") ||
              w.includes("not supported"),
          ),
        ).toBe(true);
      });

      test("warns when downgrading Windsurf with auto_execution_mode", () => {
        const content = `---
description: My workflow
auto_execution_mode: 2
---

Content here.
`;
        const result = adaptVersion("windsurf", content, "wave-8", "wave-1");
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(
          result.warnings.some((w) => w.includes("auto_execution_mode")),
        ).toBe(true);
      });

      test("warns when downgrading Cursor with globs", () => {
        const content = `---
description: My rule
globs:
  - "**/*.ts"
---

Rule content.
`;
        const result = adaptVersion("cursor", content, "1.7", "1.6");
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some((w) => w.includes("Globs"))).toBe(true);
      });
    });

    describe("Content preservation", () => {
      test("preserves body content during adaptation", () => {
        const content = `---
name: my-skill
---

This is important content that should not change.

- List item 1
- List item 2

\`\`\`typescript
const code = "preserved";
\`\`\`
`;
        const result = adaptVersion("claude", content, "1.0", "2.0");
        expect(result.content).toContain("This is important content");
        expect(result.content).toContain("List item 1");
        expect(result.content).toContain('const code = "preserved"');
      });

      test("handles content without frontmatter", () => {
        const content = "Plain content without frontmatter.";
        const result = adaptVersion("cursor", content, "0.34", "1.7");
        expect(result.content).toContain("Plain content without frontmatter");
      });
    });
  });
});
