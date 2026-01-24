/**
 * Tests for version detection
 */

import { describe, expect, test } from "bun:test";
import {
  detectVersion,
  detectClaudeVersion,
  detectWindsurfVersion,
  detectCursorVersion,
} from "./version-detector.js";

describe("Version Detection", () => {
  describe("detectClaudeVersion", () => {
    test("detects 1.0 for basic skill without agent/model fields", () => {
      const content = `---
name: my-skill
description: A basic skill
---

Do something useful.
`;
      const result = detectClaudeVersion(content);
      expect(result.version).toBe("1.0");
    });

    test("detects 1.5 for skill with agent field", () => {
      const content = `---
name: my-skill
description: A skill with agent
agent: code-architect
---

Do something useful.
`;
      const result = detectClaudeVersion(content);
      expect(result.version).toBe("1.5");
      expect(result.confidence).toBeGreaterThanOrEqual(50);
    });

    test("detects 1.5 for skill with model field", () => {
      const content = `---
name: my-skill
description: A skill with model
model: opus
---

Do something useful.
`;
      const result = detectClaudeVersion(content);
      expect(result.version).toBe("1.5");
    });

    test("detects 2.0 from rules file path", () => {
      const content = "Some rule content";
      const result = detectClaudeVersion(
        content,
        "/project/.claude/rules/my-rule.md",
      );
      expect(result.version).toBe("2.0");
      expect(result.isDefinitive).toBe(true);
    });
  });

  describe("detectWindsurfVersion", () => {
    test("detects wave-1 for content without auto_execution_mode", () => {
      const content = `---
description: A basic workflow
---

Do something useful.
`;
      const result = detectWindsurfVersion(content);
      expect(result.version).toBe("wave-1");
    });

    test("detects wave-8 for content with auto_execution_mode", () => {
      const content = `---
description: A workflow with auto execution
auto_execution_mode: 2
---

Do something useful.
`;
      const result = detectWindsurfVersion(content);
      expect(result.version).toBe("wave-8");
      expect(result.confidence).toBeGreaterThanOrEqual(50);
    });

    test("detects wave-10 from skills file path", () => {
      const content = "Skill content";
      const result = detectWindsurfVersion(
        content,
        "/project/.windsurf/skills/my-skill/SKILL.md",
      );
      expect(result.version).toBe("wave-10");
      expect(result.isDefinitive).toBe(true);
    });
  });

  describe("detectCursorVersion", () => {
    test("detects 0.34 from .cursorrules path", () => {
      const content = "Rule content";
      const result = detectCursorVersion(content, "/project/.cursorrules");
      expect(result.version).toBe("0.34");
    });

    test("detects 1.6 from commands file path", () => {
      const content = "Command content";
      const result = detectCursorVersion(
        content,
        "/project/.cursor/commands/my-command.md",
      );
      expect(result.version).toBe("1.6");
    });

    test("detects 1.7 from .mdc file path", () => {
      const content = "Rule content";
      const result = detectCursorVersion(
        content,
        "/project/.cursor/rules/my-rule.mdc",
      );
      expect(result.version).toBe("1.7");
      expect(result.isDefinitive).toBe(true);
    });

    test("detects 1.7+ for content with globs frontmatter", () => {
      const content = `---
description: A rule with globs
globs:
  - "**/*.ts"
---

Rule content.
`;
      const result = detectCursorVersion(content);
      // globs is a 1.7+ feature, so version should be 1.7 or later
      expect(["1.7", "2.2", "2.3"]).toContain(result.version);
    });
  });

  describe("detectVersion (unified)", () => {
    test("routes to Claude detection", () => {
      const content = `---
name: my-skill
agent: explore
---

Content.
`;
      const result = detectVersion("claude", content);
      expect(result.version).toBe("1.5");
    });

    test("routes to Windsurf detection", () => {
      const content = `---
description: A workflow
auto_execution_mode: 1
---

Content.
`;
      const result = detectVersion("windsurf", content);
      expect(result.version).toBe("wave-8");
    });

    test("routes to Cursor detection", () => {
      const result = detectVersion(
        "cursor",
        "content",
        "/project/.cursor/rules/test.mdc",
      );
      expect(result.version).toBe("1.7");
    });

    test("returns default for unsupported agent", () => {
      const result = detectVersion("gemini", "content");
      expect(result.version).toBe("1.0");
      expect(result.confidence).toBe(30);
    });
  });

  describe("Detection confidence", () => {
    test("file path matches are more confident", () => {
      const contentResult = detectClaudeVersion("simple content");
      const pathResult = detectClaudeVersion(
        "simple content",
        "/project/.claude/rules/test.md",
      );

      expect(pathResult.confidence).toBeGreaterThan(contentResult.confidence);
    });

    test("multiple markers increase confidence", () => {
      const singleMarker = `---
agent: test
---
Content.
`;
      const multipleMarkers = `---
agent: test
model: opus
context: fork
---
Content.
`;
      const singleResult = detectClaudeVersion(singleMarker);
      const multipleResult = detectClaudeVersion(multipleMarkers);

      expect(multipleResult.confidence).toBeGreaterThan(
        singleResult.confidence,
      );
    });

    test("matched markers are reported", () => {
      const content = `---
name: my-skill
agent: test
model: opus
---
Content.
`;
      const result = detectClaudeVersion(content);
      expect(result.matchedMarkers.length).toBeGreaterThan(0);
    });
  });
});
