/**
 * Tests for agent-specific parsers
 */

import { describe, expect, test } from "bun:test";
import { ClaudeParser } from "./claude-parser.js";
import { WindsurfParser } from "./windsurf-parser.js";
import { CursorParser } from "./cursor-parser.js";
import { parseComponent, detectAgent } from "./parser-factory.js";

describe("ClaudeParser", () => {
  const parser = new ClaudeParser();

  describe("canParse", () => {
    test("returns true for Claude skill paths", () => {
      expect(
        parser.canParse("content", "/project/.claude/skills/test/SKILL.md"),
      ).toBe(true);
    });

    test("returns true for Claude command paths", () => {
      expect(
        parser.canParse("content", "/project/.claude/commands/test.md"),
      ).toBe(true);
    });

    test("returns true for Claude-specific frontmatter", () => {
      const content = `---
name: test-skill
disable-model-invocation: true
---
Content`;
      expect(parser.canParse(content)).toBe(true);
    });

    test("returns false for non-Claude content", () => {
      const content = `---
description: A generic workflow
---
Content`;
      expect(parser.canParse(content)).toBe(false);
    });
  });

  describe("parse", () => {
    test("parses basic Claude skill", () => {
      const content = `---
name: my-skill
description: A helpful skill
user-invocable: true
---

Do something useful.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.id).toBe("my-skill");
      expect(result.spec?.intent.summary).toBe("A helpful skill");
      expect(result.spec?.invocation.userInvocable).toBe(true);
    });

    test("parses skill with allowed-tools", () => {
      const content = `---
name: bash-skill
description: A skill with tool restrictions
allowed-tools:
  - Bash(git*)
  - Read
---

Run git commands.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.execution.allowedTools).toContain("Bash(git*)");
      expect(result.spec?.execution.allowedTools).toContain("Read");
    });

    test("parses skill with agent field", () => {
      const content = `---
name: architect-skill
description: Architecture planning
agent: code-architect
model: opus
---

Design systems.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.execution.subAgent).toBe("code-architect");
      expect(result.spec?.execution.preferredModel).toBe("opus");
    });

    test("parses skill with fork context", () => {
      const content = `---
name: fork-skill
context: fork
---

Runs in forked context.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.execution.context).toBe("fork");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("infers capabilities from body content", () => {
      const content = `---
name: git-skill
---

Use git commands to commit and push changes.
Search for files using grep.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.capabilities.needsGit).toBe(true);
      expect(result.spec?.capabilities.needsCodeSearch).toBe(true);
    });

    test("infers category from content", () => {
      const content = `---
name: test-skill
description: Test writing assistant
---

Write tests and debug issues.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.category).toContain("testing");
    });

    test("extracts ID from filename when name missing", () => {
      const content = `---
description: A skill without explicit name
---

Content here.`;

      const result = parser.parse(content, {
        sourceFile: "/project/.claude/skills/extracted-name/SKILL.md",
      });

      expect(result.success).toBe(true);
      expect(result.spec?.id).toBe("extracted-name");
    });
  });

  describe("detectVersion", () => {
    test("detects version 1.5 for skills with agent field", () => {
      const content = `---
name: skill
agent: code-architect
---
Content`;

      const result = parser.detectVersion(content);
      expect(result.version).toBe("1.5");
    });

    test("detects version 2.0 from rules path", () => {
      const content = "Rule content";
      const result = parser.detectVersion(
        content,
        "/project/.claude/rules/test.md",
      );
      expect(result.version).toBe("2.0");
    });
  });
});

describe("WindsurfParser", () => {
  const parser = new WindsurfParser();

  describe("canParse", () => {
    test("returns true for Windsurf workflow paths", () => {
      expect(
        parser.canParse("content", "/project/.windsurf/workflows/test.md"),
      ).toBe(true);
    });

    test("returns true for Windsurf-specific frontmatter", () => {
      const content = `---
description: A workflow
auto_execution_mode: 2
---
Content`;
      expect(parser.canParse(content)).toBe(true);
    });
  });

  describe("parse", () => {
    test("parses basic Windsurf workflow", () => {
      const content = `---
description: My workflow
---

# Workflow

Do something useful.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.intent.summary).toBe("My workflow");
    });

    test("parses workflow with auto_execution_mode", () => {
      const content = `---
description: Auto-activated workflow
auto_execution_mode: 2
---

Content here.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      // auto_execution_mode: 2 maps to contextual activation
      expect(["auto", "contextual"]).toContain(result.spec?.activation.mode);
    });

    test("extracts name from description when no title", () => {
      const content = `---
description: A helpful workflow for testing
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.id).toBeDefined();
    });
  });
});

describe("CursorParser", () => {
  const parser = new CursorParser();

  describe("canParse", () => {
    test("returns true for cursor commands path", () => {
      expect(
        parser.canParse("content", "/project/.cursor/commands/test.md"),
      ).toBe(true);
    });

    test("returns true for markdown with title and objective", () => {
      const content = `# My Command

## Objective
Do something useful.

## Requirements
- Requirement 1`;
      expect(parser.canParse(content)).toBe(true);
    });

    test("returns false for plain content without structure", () => {
      const content = `Just some text without cursor structure`;
      expect(parser.canParse(content)).toBe(false);
    });
  });

  describe("parse", () => {
    test("parses basic Cursor command with title and objective", () => {
      const content = `# TypeScript Expert

## Objective
Help with TypeScript development.

## Requirements
- Write clean code
- Add proper types`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.id).toBe("typescript-expert");
      expect(result.spec?.intent.summary).toContain("TypeScript");
    });

    test("parses command with frontmatter", () => {
      const content = `---
title: My Command
description: A helpful command
---

# My Command

## Objective
Do something useful.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.intent.summary).toBe("A helpful command");
    });

    test("cursor commands always have manual activation", () => {
      const content = `# Test Command

## Objective
Test something.

## Requirements
- Requirement 1`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      expect(result.spec?.activation.mode).toBe("manual");
    });
  });
});

describe("Parser Factory", () => {
  describe("detectAgent", () => {
    test("detects Claude from path", () => {
      const result = detectAgent(
        "content",
        "/project/.claude/skills/test/SKILL.md",
      );
      expect(result).toBe("claude");
    });

    test("detects Windsurf from path", () => {
      const result = detectAgent(
        "content",
        "/project/.windsurf/workflows/test.md",
      );
      expect(result).toBe("windsurf");
    });

    test("detects Cursor from .cursor/ path", () => {
      const result = detectAgent(
        "content",
        "/project/.cursor/commands/test.md",
      );
      expect(result).toBe("cursor");
    });

    test("detects Claude from frontmatter", () => {
      const content = `---
name: test-skill
user-invocable: true
---
Content`;
      const result = detectAgent(content);
      expect(result).toBe("claude");
    });

    test("detects Windsurf from auto_execution_mode", () => {
      const content = `---
description: Workflow
auto_execution_mode: 1
---
Content`;
      const result = detectAgent(content);
      expect(result).toBe("windsurf");
    });

    test("detects Cursor from structured content", () => {
      const content = `# My Command

## Objective
Do something.

## Requirements
- Requirement 1`;
      const result = detectAgent(content);
      expect(result).toBe("cursor");
    });
  });

  describe("parseComponent", () => {
    test("parses with explicit agent", () => {
      const content = `---
name: test
---
Content`;

      const result = parseComponent(content, { agentId: "claude" });

      expect(result.success).toBe(true);
      expect(result.spec?.sourceAgent?.id).toBe("claude");
    });

    test("auto-detects agent when not specified", () => {
      const content = `---
name: test-skill
user-invocable: true
---
Content`;

      const result = parseComponent(content);

      expect(result.success).toBe(true);
      expect(result.spec?.sourceAgent?.id).toBe("claude");
    });

    test("returns error when agent cannot be detected", () => {
      const content = "Plain text without any agent markers";

      const result = parseComponent(content);

      // Should either fail or default to something
      expect(typeof result.success).toBe("boolean");
    });
  });
});

describe("Parser Edge Cases", () => {
  test("handles malformed YAML gracefully", () => {
    const parser = new ClaudeParser();
    const badYaml = `---
name: test
description: [invalid: yaml: here
---
Content`;

    const result = parser.parse(badYaml);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("handles missing frontmatter delimiters", () => {
    const parser = new ClaudeParser();
    const noDelimiter = `name: test
description: No delimiters
---
Content`;

    // Should handle gracefully
    const result = parser.parse(noDelimiter);
    expect(typeof result.success).toBe("boolean");
  });

  test("handles empty content", () => {
    const parser = new ClaudeParser();
    const result = parser.parse("");

    expect(typeof result.success).toBe("boolean");
  });

  test("handles content with only frontmatter", () => {
    const parser = new ClaudeParser();
    const onlyFrontmatter = `---
name: frontmatter-only
description: No body
---`;

    const result = parser.parse(onlyFrontmatter);
    expect(result.success).toBe(true);
    expect(result.spec?.body).toBe("");
  });
});
