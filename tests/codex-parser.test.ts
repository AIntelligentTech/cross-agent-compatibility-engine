/**
 * Tests for OpenAI Codex parser
 */

import { describe, it, expect } from "bun:test";
import { CodexParser } from "../src/parsing/codex-parser";

describe("Codex Parser", () => {
  const parser = new CodexParser();

  describe("canParse", () => {
    it("should detect Codex skills by filename", () => {
      expect(parser.canParse("", ".codex/skills/my-skill/SKILL.md")).toBe(true);
      expect(parser.canParse("", ".codex/commands/my-command.md")).toBe(true);
    });

    it("should detect Codex by TOML frontmatter", () => {
      const content = `---
name: test-skill
description: Test skill
approval_policy = "on-request"
---

Test body`;
      expect(parser.canParse(content)).toBe(true);
    });

    it("should detect Codex by sandbox_mode", () => {
      const content = `---
name: test
sandbox_mode = "workspace-write"
---

Body`;
      expect(parser.canParse(content)).toBe(true);
    });

    it("should reject other agent formats", () => {
      const claudeContent = `---
name: test
context: fork
---

Body`;
      expect(parser.canParse(claudeContent)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse a basic skill", () => {
      const content = `---
name: code-reviewer
description: Review code for quality
version: "1.0.0"
---

# Code Reviewer

Review code for quality and best practices.`;

      const result = parser.parse(content, { sourceFile: "test.md" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.id).toBe("code-reviewer");
        expect(result.spec.componentType).toBe("skill");
        expect(result.spec.intent.summary).toBe("Review code for quality");
        expect(result.spec.sourceAgent?.id).toBe("codex");
      }
    });

    it("should parse a command with slash_command", () => {
      const content = `---
name: fix-linting
description: Fix linting issues
slash_command: /fix-lint
argument_hint: <file>
---

Fix linting issues in the specified file.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.componentType).toBe("command");
        expect(result.spec.invocation.slashCommand).toBe("/fix-lint");
        expect(result.spec.invocation.argumentHint).toBe("<file>");
        expect(result.spec.invocation.userInvocable).toBe(true);
      }
    });

    it("should parse approval_policy", () => {
      const content = `---
name: dangerous-skill
description: A dangerous skill
approval_policy: "never"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.approvalPolicy).toBe("never");
        expect(result.spec.activation.safetyLevel).toBe("dangerous");
      }
    });

    it("should parse sandbox_mode", () => {
      const content = `---
name: test-skill
description: Test
sandbox_mode: "workspace-write"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.sandboxMode).toBe("workspace-write");
        expect(result.spec.activation.safetyLevel).toBe("sensitive");
      }
    });

    it("should parse MCP servers", () => {
      const content = `---
name: mcp-skill
description: Uses MCP
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.mcpServers).toBeDefined();
        expect(result.spec.metadata.mcpServers?.github).toBeDefined();
      }
    });

    it("should parse tools list", () => {
      const content = `---
name: tool-skill
description: Uses tools
tools:
  - web_search
  - file_read
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.allowedTools).toEqual(["web_search", "file_read"]);
      }
    });

    it("should parse model specification", () => {
      const content = `---
name: model-skill
description: Uses specific model
model: "gpt-5-codex"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.model).toBe("gpt-5-codex");
        expect(result.spec.execution.preferredModel).toBe("gpt-5-codex");
      }
    });

    it("should detect rule by globs", () => {
      const content = `---
name: js-rule
description: JS rule
globs: "*.js"
---

Always use strict mode in JavaScript.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.componentType).toBe("rule");
        expect(result.spec.activation.triggers).toHaveLength(1);
        expect(result.spec.activation.triggers?.[0]?.type).toBe("glob");
      }
    });

    it("should handle missing frontmatter gracefully", () => {
      const content = `# Just a title

Some body content without frontmatter.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.id).toBe("unnamed");
        expect(result.spec.componentType).toBe("skill");
      }
    });

    it("should parse web_search mode", () => {
      const content = `---
name: search-skill
description: Uses web search
web_search: "live"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.webSearch).toBe("live");
      }
    });

    it("should parse features", () => {
      const content = `---
name: feature-skill
description: Uses features
features:
  shell_snapshot: true
  unified_exec: false
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.features).toBeDefined();
        expect(result.spec.metadata.features?.shell_snapshot).toBe(true);
      }
    });
  });
});
