
import { describe, it, expect } from "bun:test";
import { ClaudeValidator } from "../src/validation/agents/claude-validator.js";
import { CursorValidator } from "../src/validation/agents/cursor-validator.js";
import { WindsurfValidator } from "../src/validation/agents/windsurf-validator.js";

describe("Structure Validation (Leading Comments)", () => {
  const claudeValidator = new ClaudeValidator();
  const cursorValidator = new CursorValidator();
  const windsurfValidator = new WindsurfValidator();

  const invalidContent = `---
name: test-skill
description: A test skill
---
<!-- Converted from cursor -->

This is the body.
`;

  const validContent = `---
name: test-skill
description: A test skill
---

This is the body.
`;

  it("should reject leading comments in Claude skills", () => {
    const result = claudeValidator.validate(invalidContent, "skill");
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === "LEADING_COMMENT")).toBe(true);
  });

  it("should accept body without leading comments in Claude skills", () => {
    const result = claudeValidator.validate(validContent, "skill");
    expect(result.valid).toBe(true);
  });

  it("should reject leading comments in Windsurf skills", () => {
    const result = windsurfValidator.validate(invalidContent, "skill");
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === "LEADING_COMMENT")).toBe(true);
  });

  it("should reject leading comments in Cursor skills", () => {
    const result = cursorValidator.validate(invalidContent, "skill");
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === "LEADING_COMMENT")).toBe(true);
  });
});
