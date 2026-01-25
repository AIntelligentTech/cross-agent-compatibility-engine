/**
 * Tests for agent and version detection
 */

import { describe, test, expect } from "bun:test";
import { detectAgent, parseComponent } from "../src/parsing/parser-factory.js";

describe("Agent Detection", () => {
  describe("Cursor command detection", () => {
    test("should detect Cursor command with ## Goal section", () => {
      const content = `# My Workflow

This workflow does something.

## Goal

Achieve the desired outcome.

## 1. First Step

Do the first thing.
`;
      const agent = detectAgent(content);
      expect(agent).toBe("cursor");
    });

    test("should detect Cursor command with numbered sections", () => {
      const content = `# Deep Bash Workflow

This workflow instructs Cascade to think and act like an expert.

---

## 1. Clarify Task

**Goal:** Understand what the automation must do.

## 2. Design Architecture

**Goal:** Treat the automation as a small system.
`;
      const agent = detectAgent(content);
      expect(agent).toBe("cursor");
    });

    test("should detect Cursor command with ## When to Use section", () => {
      const content = `# Test Command

A test command for validation.

## When to Use

Use this command when testing.

## Steps

1. Do something
2. Do another thing
`;
      const agent = detectAgent(content);
      expect(agent).toBe("cursor");
    });

    test("should detect Cursor from filename", () => {
      const content = `# Some Command`;
      const agent = detectAgent(content, ".cursor/commands/my-command.md");
      expect(agent).toBe("cursor");
    });

    test("should NOT detect plain markdown as Cursor", () => {
      const content = `# Just a Title

Some regular markdown content without Cursor-specific sections.

This is just a normal document.
`;
      const agent = detectAgent(content);
      // Should not match Cursor since no specific patterns
      expect(agent).not.toBe("cursor");
    });
  });

  describe("Claude skill detection", () => {
    test("should detect Claude skill with YAML frontmatter", () => {
      const content = `---
name: test-skill
description: A test skill
---

# Test Skill

Instructions here.
`;
      const agent = detectAgent(content);
      expect(agent).toBe("claude");
    });

    test("should detect Claude from filename", () => {
      const content = `---
name: test
description: Test
---

Body`;
      const agent = detectAgent(content, ".claude/skills/test/SKILL.md");
      expect(agent).toBe("claude");
    });
  });

  describe("Windsurf workflow detection", () => {
    test("should detect Windsurf workflow with description and auto_execution_mode", () => {
      const content = `---
description: A workflow description
auto_execution_mode: 3
---

# Workflow

Body content.
`;
      const agent = detectAgent(content);
      expect(agent).toBe("windsurf");
    });

    test("should detect Windsurf from filename", () => {
      const content = `---
description: Test
---

Body`;
      const agent = detectAgent(content, ".windsurf/workflows/test.md");
      expect(agent).toBe("windsurf");
    });
  });

  describe("Universal AGENTS.md detection", () => {
    test("should detect AGENTS.md by filename", () => {
      const content = `# Project Guidelines

## Build Commands

- npm install
- npm run build
`;
      const agent = detectAgent(content, "AGENTS.md");
      expect(agent).toBe("universal");
    });

    test("should detect AGENTS.md by header", () => {
      const content = `# AGENTS.md

## Build/Lint/Test Commands

- pnpm install
- pnpm test
`;
      const agent = detectAgent(content);
      expect(agent).toBe("universal");
    });

    test("should detect AGENTS.md by typical sections", () => {
      const content = `# Project

## Setup

Install dependencies.

## Code Style Guidelines

Use TypeScript.
`;
      const agent = detectAgent(content);
      expect(agent).toBe("universal");
    });
  });

  describe("Parsing with detection", () => {
    test("should parse Cursor command without explicit --from", () => {
      const content = `# Test Command

## Goal

Do something useful.

## 1. Step One

First step instructions.
`;
      const result = parseComponent(content);
      expect(result.success).toBe(true);
      expect(result.spec?.sourceAgent.id).toBe("cursor");
    });

    test("should parse AGENTS.md without explicit --from", () => {
      const content = `# AGENTS.md

## Build Commands

- npm test
`;
      const result = parseComponent(content, { sourceFile: "AGENTS.md" });
      expect(result.success).toBe(true);
      expect(result.spec?.sourceAgent.id).toBe("universal");
    });
  });
});

describe("Version Detection Priority", () => {
  test("should not default to Gemini for arbitrary files", () => {
    // Any file with no specific patterns should not match Gemini
    const content = `---
name: test
description: Test
---

Some content.
`;
    const agent = detectAgent(content, "/tmp/test/some-file.md");
    // Should detect as Claude (has YAML frontmatter with name/description)
    expect(agent).toBe("claude");
    expect(agent).not.toBe("gemini");
  });

  test("should detect GEMINI.md by filename", () => {
    const content = `# Project Context

Some instructions.
`;
    const agent = detectAgent(content, "GEMINI.md");
    expect(agent).toBe("gemini");
  });
});
