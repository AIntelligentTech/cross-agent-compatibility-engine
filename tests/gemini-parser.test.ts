/**
 * Tests for Google Gemini parser
 */

import { describe, it, expect } from "bun:test";
import { GeminiParser } from "../src/parsing/gemini-parser";

describe("Gemini Parser", () => {
  const parser = new GeminiParser();

  describe("canParse", () => {
    it("should detect Gemini skills by filename", () => {
      expect(parser.canParse("", ".gemini/skills/my-skill/SKILL.md")).toBe(true);
      expect(parser.canParse("", "GEMINI.md")).toBe(true);
    });

    it("should detect Gemini by code_execution field", () => {
      const content = `---
name: test-skill
description: Test skill
code_execution: true
---

Test body`;
      expect(parser.canParse(content)).toBe(true);
    });

    it("should detect Gemini by temperature", () => {
      const content = `---
name: test
temperature: 0.7
---

Body`;
      expect(parser.canParse(content)).toBe(true);
    });

    it("should detect Gemini by google_search", () => {
      const content = `---
name: test
google_search: true
---

Body`;
      expect(parser.canParse(content)).toBe(true);
    });

    it("should detect Gemini by include_directories", () => {
      const content = `---
name: test
include_directories:
  - /path/to/project1
  - /path/to/project2
---

Body`;
      expect(parser.canParse(content)).toBe(true);
    });

    it("should reject other agent formats", () => {
      const codexContent = `---
name: test
approval_policy = "on-request"
---

Body`;
      expect(parser.canParse(codexContent)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse a basic skill", () => {
      const content = `---
name: code-reviewer
description: Review code for quality
version: "1.0.0"
instruction: "You are a code reviewer"
---

# Code Reviewer

Review code for quality and best practices.`;

      const result = parser.parse(content, { sourceFile: "test.md" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.id).toBe("code-reviewer");
        expect(result.spec.componentType).toBe("skill");
        expect(result.spec.intent.summary).toBe("Review code for quality");
        expect(result.spec.sourceAgent?.id).toBe("gemini");
      }
    });

    it("should parse a command with slash_command", () => {
      const content = `---
name: fix-linting
description: Fix linting issues
slash_command: /fix-lint
---

Fix linting issues in the specified file.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.componentType).toBe("command");
        expect(result.spec.invocation.slashCommand).toBe("/fix-lint");
        expect(result.spec.invocation.userInvocable).toBe(true);
      }
    });

    it("should parse temperature", () => {
      const content = `---
name: creative-skill
description: Creative skill
temperature: 1.2
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.temperature).toBe(1.2);
      }
    });

    it("should parse max_tokens", () => {
      const content = `---
name: long-skill
description: Long output skill
max_tokens: 4096
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.maxTokens).toBe(4096);
      }
    });

    it("should parse code_execution", () => {
      const content = `---
name: code-skill
description: Executes code
code_execution: true
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.codeExecution).toBe(true);
        expect(result.spec.capabilities.needsShell).toBe(true);
        expect(result.spec.activation.safetyLevel).toBe("sensitive");
      }
    });

    it("should parse google_search", () => {
      const content = `---
name: search-skill
description: Uses Google search
google_search: true
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.googleSearch).toBe(true);
        expect(result.spec.capabilities.needsNetwork).toBe(true);
        expect(result.spec.capabilities.needsBrowser).toBe(true);
      }
    });

    it("should parse include_directories", () => {
      const content = `---
name: multi-dir-skill
description: Multi directory skill
include_directories:
  - /path/to/project1
  - /path/to/project2
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.includeDirectories).toEqual([
          "/path/to/project1",
          "/path/to/project2"
        ]);
      }
    });

    it("should parse model specification", () => {
      const content = `---
name: model-skill
description: Uses specific model
model: "gemini-2.5-pro"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.model).toBe("gemini-2.5-pro");
        expect(result.spec.execution.preferredModel).toBe("gemini-2.5-pro");
      }
    });

    it("should parse tools list", () => {
      const content = `---
name: tool-skill
description: Uses tools
tools:
  - code_execution
  - google_search
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.tools).toEqual(["code_execution", "google_search"]);
        expect(result.spec.execution.allowedTools).toEqual(["code_execution", "google_search"]);
      }
    });

    it("should parse instruction field", () => {
      const content = `---
name: instruction-skill
description: Has instruction
instruction: "You are a helpful assistant"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.metadata.instruction).toBe("You are a helpful assistant");
      }
    });

    it("should parse examples", () => {
      const content = `---
name: example-skill
description: Has examples
examples:
  - "Example 1"
  - "Example 2"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.intent.examples).toEqual(["Example 1", "Example 2"]);
      }
    });

    it("should detect memory by short body", () => {
      const content = `---
name: my-memory
description: Some memory
---

Short content.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.componentType).toBe("memory");
      }
    });

    it("should handle missing frontmatter gracefully", () => {
      const content = `# Just a title

Some body content without frontmatter.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.id).toBe("unnamed");
        // Short content without frontmatter defaults to memory
        expect(result.spec.componentType).toBe("memory");
      }
    });

    it("should parse globs for contextual activation", () => {
      const content = `---
name: context-skill
description: Contextual skill
globs: "*.ts"
---

Body`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.activation.mode).toBe("contextual");
        expect(result.spec.activation.triggers).toHaveLength(1);
      }
    });
  });
});
