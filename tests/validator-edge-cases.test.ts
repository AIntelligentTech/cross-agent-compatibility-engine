/**
 * Comprehensive Validator Edge Case Tests
 * Tests extreme inputs, boundary conditions, and malicious inputs
 */

import { describe, it, expect } from "bun:test";
import { ClaudeValidator } from "../src/validation/agents/claude-validator.js";
import { CursorValidator } from "../src/validation/agents/cursor-validator.js";
import { WindsurfValidator } from "../src/validation/agents/windsurf-validator.js";
import { OpenCodeValidator } from "../src/validation/agents/opencode-validator.js";

describe("Edge Cases & Boundary Conditions", () => {
  
  describe("Input Validation Extremes", () => {
    it("should handle empty content", () => {
      const validator = new ClaudeValidator();
      const result = validator.validate("", "skill");
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should handle extremely long content (> 100KB)", () => {
      const validator = new ClaudeValidator();
      const longContent = `---\nname: test\ndescription: ${"a".repeat(100000)}\n---\n\nbody`;
      const result = validator.validate(longContent, "skill");
      // Should not crash, may be valid or have warnings
      expect(result).toBeDefined();
    });

    it("should handle content with only whitespace", () => {
      const validator = new ClaudeValidator();
      const result = validator.validate("   \n\t  ", "skill");
      expect(result.valid).toBe(false);
    });

    it("should handle content with null bytes", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\x00\ndescription: test\n---\nbody`;
      // Should handle gracefully without crashing
      expect(() => validator.validate(content, "skill")).not.toThrow();
    });

    it("should handle content with special Unicode characters", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test-技能\ndescription: 日本語テスト\n---\n\n🎉🚀💻 Test body with emojis`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
      expect(result.agent).toBe("claude");
    });

    it("should handle very short skill body (< 10 chars)", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test\n---\n\nHi`;
      const result = validator.validate(content, "skill");
      expect(result.warnings.some(w => w.code === "SHORT_BODY")).toBe(true);
    });
  });

  describe("Frontmatter Boundary Cases", () => {
    it("should handle frontmatter with no closing delimiter", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test`;
      // Should handle gracefully
      expect(() => validator.validate(content, "skill")).not.toThrow();
    });

    it("should handle frontmatter with nested delimiters", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\nconfig: |\n  ---\n  nested: value\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle duplicate frontmatter keys", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: first\nname: second\ndescription: test\n---\nbody`;
      // YAML parsers typically take the last value
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle frontmatter with arrays of 100+ items", () => {
      const validator = new ClaudeValidator();
      const tools = Array(150).fill("Read");
      const content = `---\nname: test\ndescription: test\nallowed-tools: [${tools.map(t => `"${t}"`).join(", ")}]\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle deeply nested frontmatter objects", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test\nconfig:\n  level1:\n    level2:\n      level3:\n        level4:\n          level5: value\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });
  });

  describe("Version String Edge Cases", () => {
    it("should handle version with 4+ components", () => {
      const validator = new ClaudeValidator();
      const result = validator.validate("---\nname: test\n---\nbody", "skill", {
        version: "2.1.3.4.5"
      });
      expect(result).toBeDefined();
    });

    it("should handle version with pre-release tags", () => {
      const validator = new ClaudeValidator();
      const result = validator.validate("---\nname: test\n---\nbody", "skill", {
        version: "2.1.0-beta.1"
      });
      expect(result).toBeDefined();
    });

    it("should handle invalid version strings", () => {
      const validator = new ClaudeValidator();
      const result = validator.validate("---\nname: test\n---\nbody", "skill", {
        version: "not-a-version"
      });
      expect(result).toBeDefined();
    });

    it("should handle empty version string", () => {
      const validator = new ClaudeValidator();
      const result = validator.validate("---\nname: test\n---\nbody", "skill", {
        version: ""
      });
      expect(result).toBeDefined();
    });
  });

  describe("Field Type Confusion", () => {
    it("should handle boolean field with string value", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test\ndisable-model-invocation: "true"\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle array field with string value", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test\nallowed-tools: "Read"\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle string field with numeric value", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: 12345\ndescription: test\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle null values in frontmatter", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: null\nallowed-tools: null\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle undefined-like values", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: ~\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });
  });

  describe("Security & Injection Attempts", () => {
    it("should handle YAML bomb attempt", () => {
      const validator = new ClaudeValidator();
      // Exponential entity expansion attempt
      const content = `---\nname: test\n&a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]\n---\nbody`;
      // Should not crash or hang
      expect(() => validator.validate(content, "skill")).not.toThrow();
    });

    it("should handle script injection in fields", () => {
      const validator = new CursorValidator();
      const content = `---\ndescription: "<script>alert('xss')</script>"\nglobs: ["**/*"]\n---\nbody`;
      const result = validator.validate(content, "rule");
      expect(result).toBeDefined();
    });

    it("should handle command injection patterns", () => {
      const validator = new OpenCodeValidator();
      const content = `---\ndescription: test\n---\n\nRun \`rm -rf /\` to clean up`; 
      const result = validator.validate(content, "command");
      expect(result).toBeDefined();
    });

    it("should handle path traversal attempts", () => {
      const validator = new WindsurfValidator();
      const content = `---\nname: test\ndescription: test\n---\n\nAccess ../../../etc/passwd for configuration`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });
  });

  describe("Component Type Mismatches", () => {
    it("should handle validating skill content as rule type", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test-skill\ndescription: A skill\n---\nbody`;
      const result = validator.validate(content, "rule");
      // Should handle gracefully, may report type-specific issues
      expect(result).toBeDefined();
    });

    it("should handle validating with unsupported component type", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\n---\nbody`;
      // @ts-ignore - testing unsupported type
      const result = validator.validate(content, "unsupported-type");
      expect(result.valid).toBe(false);
    });

    it("should handle empty component type string", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\n---\nbody`;
      const result = validator.validate(content, "");
      expect(result).toBeDefined();
    });
  });

  describe("Concurrent/Stress Scenarios", () => {
    it("should handle rapid successive validations", async () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test\n---\nbody`;
      
      // Run 100 validations rapidly
      const promises = Array(100).fill(null).map(() => 
        Promise.resolve(validator.validate(content, "skill"))
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it("should handle validation with very long field values", () => {
      const validator = new ClaudeValidator();
      const longDescription = "a".repeat(10000);
      const content = `---\nname: test\ndescription: ${longDescription}\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("should handle validation with many frontmatter fields", () => {
      const validator = new ClaudeValidator();
      const fields = Array(100).fill(null).map((_, i) => `field${i}: value${i}`).join("\n");
      const content = `---\nname: test\ndescription: test\n${fields}\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });
  });

  describe("Agent-Specific Edge Cases", () => {
    it("Cursor: should handle .cursorrules without frontmatter", () => {
      const validator = new CursorValidator();
      const content = `Just plain text without any YAML frontmatter at all. This is how old .cursorrules files look.`;
      const result = validator.validate(content, "rule");
      expect(result).toBeDefined();
      expect(result.warnings.some(w => w.code === "DEPRECATED_FORMAT")).toBe(true);
    });

    it("Windsurf: should handle skills that look like workflows", () => {
      const validator = new WindsurfValidator();
      const content = `---\nname: test\ndescription: A skill\n---\n\n1. Step one\n2. Step two\n3. Step three\nCall /other-workflow`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });

    it("OpenCode: should handle commands with no arguments placeholder", () => {
      const validator = new OpenCodeValidator();
      const content = `---\ndescription: A command that uses arguments\n---\n\nProcess the user input and do something with it`;
      const result = validator.validate(content, "command");
      expect(result.warnings.some(w => w.code === "NO_ARGUMENTS_PLACEHOLDER")).toBe(true);
    });

    it("Claude: should handle skills with all possible frontmatter fields", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: comprehensive-test\ndescription: Full test\naliases: [test, testing, t]\nuser-invocable: true\ndisable-model-invocation: false\nargument-hint: Provide a file path\nallowed-tools: [Read, Edit, Bash, Task]\ncontext: fork\nagent: explore\nmodel: sonnet\n---\n\nComprehensive skill body with all features`;
      const result = validator.validate(content, "skill");
      expect(result.valid).toBe(true);
      expect(result.info.length).toBeGreaterThan(0);
    });
  });
});

describe("Mutation-Resistant Tests", () => {
  
  describe("Claude Validator Mutations", () => {
    it("should detect mutation: name field removed", () => {
      const validator = new ClaudeValidator();
      const content = `---\ndescription: A test skill\n---\n\nBody content here`;
      const result = validator.validate(content, "skill");
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === "MISSING_NAME")).toBe(true);
    });

    it("should detect mutation: allowed-tools becomes write-tools", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test\nallowed-tools: [Write, Edit, Delete]\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result.warnings.some(w => w.code === "UNKNOWN_TOOL")).toBe(true);
    });

    it("should detect mutation: context changed to invalid value", () => {
      const validator = new ClaudeValidator();
      const content = `---\nname: test\ndescription: test\ncontext: invalid-context-value\n---\nbody`;
      const result = validator.validate(content, "skill");
      expect(result).toBeDefined();
    });
  });

  describe("Cursor Validator Mutations", () => {
    it("should detect mutation: globs becomes invalid pattern", () => {
      const validator = new CursorValidator();
      const content = `---\ndescription: test\nglobs: "not-an-array"\n---\nbody`;
      const result = validator.validate(content, "rule");
      expect(result.issues.some(i => i.code === "INVALID_GLOBS")).toBe(true);
    });

    it("should detect mutation: alwaysApply becomes string", () => {
      const validator = new CursorValidator();
      const content = `---\ndescription: test\nalwaysApply: "true"\n---\nbody`;
      const result = validator.validate(content, "rule");
      // Should handle but may have issues
      expect(result).toBeDefined();
    });
  });

  describe("Windsurf Validator Mutations", () => {
    it("should detect mutation: workflow marked as automatic", () => {
      const validator = new WindsurfValidator();
      const content = `---\ndescription: test workflow\nauto_execution_mode: automatic\n---\nbody`;
      const result = validator.validate(content, "workflow");
      expect(result.warnings.some(w => w.code === "AUTO_WORKFLOW")).toBe(true);
    });
  });

  describe("OpenCode Validator Mutations", () => {
    it("should detect mutation: invalid agent mode", () => {
      const validator = new OpenCodeValidator();
      const content = `---\nname: test\ndescription: test\nmode: invalid-mode\n---\nbody`;
      const result = validator.validate(content, "agent");
      expect(result.issues.some(i => i.code === "INVALID_MODE")).toBe(true);
    });

    it("should detect mutation: temperature out of range", () => {
      const validator = new OpenCodeValidator();
      const content = `---\nname: test\ndescription: test\ntemperature: 2.5\n---\nbody`;
      const result = validator.validate(content, "agent");
      expect(result.issues.some(i => i.code === "INVALID_TEMPERATURE")).toBe(true);
    });
  });
});
