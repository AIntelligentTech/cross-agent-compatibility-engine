/**
 * Comprehensive tests for the validation system
 * Tests all agent validators with various valid and invalid inputs
 */

import { describe, it, expect } from "bun:test";
import { ClaudeValidator } from "../src/validation/agents/claude-validator.js";
import { CursorValidator } from "../src/validation/agents/cursor-validator.js";
import { WindsurfValidator } from "../src/validation/agents/windsurf-validator.js";
import { OpenCodeValidator } from "../src/validation/agents/opencode-validator.js";

describe("Claude Validator", () => {
  const validator = new ClaudeValidator();

  describe("Skill validation", () => {
    it("should validate a valid Claude skill", () => {
      const content = `---
name: test-skill
description: A test skill for validation
---

This is a test skill that does something useful.
It has multiple lines of instructions.
`;

      const result = validator.validate(content, "skill");
      expect(result.valid).toBe(true);
      expect(result.agent).toBe("claude");
      expect(result.componentType).toBe("skill");
      expect(result.issues).toHaveLength(0);
    });

    it("should require name field", () => {
      const content = `---
description: A skill without a name
---

Body content here.
`;

      const result = validator.validate(content, "skill");
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "MISSING_NAME")).toBe(true);
    });

    it("should warn about missing description", () => {
      const content = `---
name: test-skill
---

Body content here with enough length to not trigger other warnings.
This skill does something important and useful.
`;

      const result = validator.validate(content, "skill");
      expect(result.warnings.some((w) => w.code === "MISSING_DESCRIPTION")).toBe(
        true,
      );
    });

    it("should validate fork context in v2.1.0+", () => {
      const content = `---
name: test-skill
description: A skill with fork context
context: fork
---

Body content.
`;

      const result = validator.validate(content, "skill", {
        version: "2.1.0",
      });
      expect(result.valid).toBe(true);
      expect(result.info.some((i) => i.code === "FORK_CONTEXT")).toBe(true);
    });

    it("should reject fork context in pre-v2.1.0", () => {
      const content = `---
name: test-skill
description: A skill with fork context
context: fork
---

Body content.
`;

      const result = validator.validate(content, "skill", {
        version: "2.0.0",
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "UNSUPPORTED_CONTEXT")).toBe(
        true,
      );
    });

    it("should validate allowed-tools", () => {
      const content = `---
name: test-skill
description: A skill with tools
allowed-tools: ["Read", "Edit", "Bash"]
---

Body content.
`;

      const result = validator.validate(content, "skill");
      expect(result.valid).toBe(true);
    });

    it("should warn about unknown tools", () => {
      const content = `---
name: test-skill
description: A skill with unknown tools
allowed-tools: ["Read", "UnknownTool"]
---

Body content.
`;

      const result = validator.validate(content, "skill");
      expect(result.warnings.some((w) => w.code === "UNKNOWN_TOOL")).toBe(true);
    });
  });

  describe("Version support", () => {
    it("should support versions 2.0.0, 2.1.0, and 2.1.3", () => {
      expect(validator.supportedVersions).toContain("2.0.0");
      expect(validator.supportedVersions).toContain("2.1.0");
      expect(validator.supportedVersions).toContain("2.1.3");
    });

    it("should return latest version", () => {
      expect(validator.getLatestVersion()).toBe("2.1.3");
    });
  });
});

describe("Cursor Validator", () => {
  const validator = new CursorValidator();

  describe("Rule validation", () => {
    it("should validate a valid .mdc rule", () => {
      const content = `---
description: A test rule for validation
globs: ["src/**/*.ts"]
alwaysApply: false
---

Always follow this rule when working with TypeScript files.
Make sure to use proper types and interfaces.
`;

      const result = validator.validate(content, "rule");
      expect(result.valid).toBe(true);
      expect(result.agent).toBe("cursor");
    });

    it("should require description for .mdc rules", () => {
      const content = `---
globs: ["src/**/*.ts"]
---

Rule content.
`;

      const result = validator.validate(content, "rule");
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "MISSING_DESCRIPTION")).toBe(
        true,
      );
    });

    it("should warn about deprecated .cursorrules format", () => {
      const content = `This is a legacy .cursorrules file without frontmatter.
It contains instructions for the AI.
`;

      const result = validator.validate(content, "rule");
      expect(result.warnings.some((w) => w.code === "DEPRECATED_FORMAT")).toBe(
        true,
      );
    });

    it("should validate globs array", () => {
      const content = `---
description: A rule with invalid globs
globs: "src/**/*.ts"
---

Content.
`;

      const result = validator.validate(content, "rule");
      expect(result.issues.some((i) => i.code === "INVALID_GLOBS")).toBe(true);
    });

    it("should suggest adding always phrase", () => {
      const content = `---
description: A rule without always phrase
globs: ["src/**/*.ts"]
---

Use TypeScript best practices.
`;

      const result = validator.validate(content, "rule");
      expect(
        result.warnings.some((w) => w.code === "NO_ALWAYS_PHRASE"),
      ).toBe(true);
    });
  });

  describe("Command validation", () => {
    it("should validate a valid command", () => {
      const content = `Run the test suite and report results.
Make sure to check for any failures.
`;

      const result = validator.validate(content, "command");
      expect(result.valid).toBe(true);
    });

    it("should reject very short commands", () => {
      const content = `Short.`;

      const result = validator.validate(content, "command");
      expect(result.issues.some((i) => i.code === "SHORT_COMMAND")).toBe(true);
    });
  });
});

describe("Windsurf Validator", () => {
  const validator = new WindsurfValidator();

  describe("Skill validation", () => {
    it("should validate a valid skill", () => {
      const content = `---
name: test-skill
description: A test skill
tags: ["testing", "validation"]
---

This skill provides procedural knowledge for testing.
It includes detailed instructions.
`;

      const result = validator.validate(content, "skill");
      expect(result.valid).toBe(true);
      expect(result.agent).toBe("windsurf");
    });

    it("should distinguish skills from workflows", () => {
      const content = `---
name: test-skill
description: A skill that looks like a workflow
---

1. First step
2. Second step
3. Third step
`;

      const result = validator.validate(content, "skill");
      expect(result.warnings.some((w) => w.code === "STEPS_IN_SKILL")).toBe(
        true,
      );
    });

    it("should report auto-invocation for skills", () => {
      const content = `---
name: auto-skill
description: Auto invokable skill
---

Skill content.
`;

      const result = validator.validate(content, "skill");
      expect(result.info.some((i) => i.code === "AUTO_INVOCATION")).toBe(true);
    });
  });

  describe("Workflow validation", () => {
    it("should validate a valid workflow", () => {
      const content = `---
description: A deployment workflow
---

1. Run tests
2. Build project
3. Call /deploy-staging
4. Verify deployment
`;

      const result = validator.validate(content, "workflow");
      expect(result.valid).toBe(true);
    });

    it("should detect workflow chaining", () => {
      const content = `---
description: A workflow with chaining
---

1. Call /test-workflow
2. Call /build-workflow
3. Deploy
`;

      const result = validator.validate(content, "workflow");
      expect(result.info.some((i) => i.code === "CHAINING")).toBe(true);
    });

    it("should warn about missing steps", () => {
      const content = `---
description: A workflow without clear steps
---

Do some work.
Then do more work.
`;

      const result = validator.validate(content, "workflow");
      expect(result.warnings.some((w) => w.code === "NO_STEPS")).toBe(true);
    });

    it("should report manual invocation for workflows", () => {
      const content = `---
description: Manual workflow
---

Step 1.
Step 2.
`;

      const result = validator.validate(content, "workflow");
      expect(result.info.some((i) => i.code === "MANUAL_INVOCATION")).toBe(true);
    });
  });
});

describe("OpenCode Validator", () => {
  const validator = new OpenCodeValidator();

  describe("Skill validation", () => {
    it("should validate a valid skill", () => {
      const content = `---
name: test-skill
description: A test skill
agent: build
subtask: true
---

Skill content here.
`;

      const result = validator.validate(content, "skill");
      expect(result.valid).toBe(true);
      expect(result.agent).toBe("opencode");
    });

    it("should report skill tool invocation", () => {
      const content = `---
name: test-skill
description: A skill
---

Content.
`;

      const result = validator.validate(content, "skill");
      expect(result.info.some((i) => i.code === "SKILL_TOOL")).toBe(true);
    });

    it("should detect subtask mode", () => {
      const content = `---
name: isolated-skill
description: Isolated skill
subtask: true
---

Content.
`;

      const result = validator.validate(content, "skill");
      expect(result.info.some((i) => i.code === "SUBTASK_MODE")).toBe(true);
    });
  });

  describe("Command validation", () => {
    it("should validate a valid command", () => {
      const content = `---
description: A test command
---

Create a file named $ARGUMENTS.
`;

      const result = validator.validate(content, "command");
      expect(result.valid).toBe(true);
    });

    it("should warn about commands mentioning arguments without placeholder", () => {
      const content = `---
description: A command with arguments
---

Please provide an argument for this command.
`;

      const result = validator.validate(content, "command");
      expect(
        result.warnings.some((w) => w.code === "NO_ARGUMENTS_PLACEHOLDER"),
      ).toBe(true);
    });

    it("should detect shell injection", () => {
      const content = `---
description: Command with shell
---

Run !\`date\` to inject current time.
`;

      const result = validator.validate(content, "command");
      expect(result.info.some((i) => i.code === "SHELL_INJECTION")).toBe(true);
    });

    it("should detect file references", () => {
      const content = `---
description: Command with file refs
---

Read @config.json for settings.
`;

      const result = validator.validate(content, "command");
      expect(result.info.some((i) => i.code === "FILE_REFERENCES")).toBe(true);
    });
  });

  describe("Agent validation", () => {
    it("should validate a valid agent", () => {
      const content = `---
name: custom-agent
description: A custom agent
mode: subagent
temperature: 0.7
maxSteps: 50
tools: ["Read", "Edit"]
---

Agent prompt here.
`;

      const result = validator.validate(content, "agent");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid mode", () => {
      const content = `---
name: bad-agent
description: An agent with bad mode
mode: invalid
---

Content.
`;

      const result = validator.validate(content, "agent");
      expect(result.issues.some((i) => i.code === "INVALID_MODE")).toBe(true);
    });

    it("should reject invalid temperature", () => {
      const content = `---
name: hot-agent
description: An agent
temperature: 1.5
---

Content.
`;

      const result = validator.validate(content, "agent");
      expect(result.issues.some((i) => i.code === "INVALID_TEMPERATURE")).toBe(
        true,
      );
    });
  });
});

describe("Cross-agent compatibility checks", () => {
  it("should identify Claude-specific features", () => {
    const claudeValidator = new ClaudeValidator();
    const content = `---
name: claude-specific
description: Uses Claude-specific features
context: fork
agent: explore
allowed-tools: ["Read", "Edit"]
---

Content.
`;

    const result = claudeValidator.validate(content, "skill");
    expect(result.info.some((i) => i.code === "FORK_CONTEXT")).toBe(true);
    expect(result.warnings.some((w) => w.code === "UNKNOWN_AGENT")).toBe(false); // explore is valid
  });

  it("should warn about Cursor deprecation", () => {
    const cursorValidator = new CursorValidator();
    const content = `Old-style cursorrules content without frontmatter.
This format is deprecated.
`;

    const result = cursorValidator.validate(content, "rule");
    expect(result.warnings.some((w) => w.code === "DEPRECATED_FORMAT")).toBe(
      true,
    );
  });
});
