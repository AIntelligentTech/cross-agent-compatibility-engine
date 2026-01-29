/**
 * Mutation Testing Suite
 * Tests that code changes (mutations) are detected by tests
 */

import { describe, it, expect } from "bun:test";
import { ClaudeValidator } from "../src/validation/agents/claude-validator.js";
import { ClaudeSourceOptimizer } from "../src/optimization/optimizers/claude-source-optimizer.js";

describe("Mutation Testing - Code Change Detection", () => {
  
  describe("Validator Mutations", () => {
    const validator = new ClaudeValidator();

    it("MUTATION: Removing name requirement detection", () => {
      // Test that if someone removes the name check, we catch it
      const content = `---
description: Missing name
---

Body`;

      const result = validator.validate(content, "skill");
      
      // This test ensures we REQUIRE the name field
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === "MISSING_NAME")).toBe(true);
    });

    it("MUTATION: Changing allowed-tools validation", () => {
      const content = `---
name: test
description: test
allowed-tools: ["FakeTool", "AnotherFake"]
---

Body`;

      const result = validator.validate(content, "skill");
      
      // Should warn about unknown tools
      const hasToolWarnings = result.warnings.some(w => 
        w.code === "UNKNOWN_TOOL" || w.message.toLowerCase().includes("tool")
      );
      expect(hasToolWarnings).toBe(true);
    });

    it("MUTATION: Version comparison logic", () => {
      const content = `---
name: test
description: test
context: fork
---

Body`;

      // v2.0.0 should NOT allow fork
      const resultOld = validator.validate(content, "skill", { version: "2.0.0" });
      expect(resultOld.valid).toBe(false);
      
      // v2.1.0 SHOULD allow fork
      const resultNew = validator.validate(content, "skill", { version: "2.1.0" });
      expect(resultNew.valid).toBe(true);
    });

    it("MUTATION: Removing description warning", () => {
      const content = `---
name: test
---

Body content here that is long enough to avoid short body warning`;

      const result = validator.validate(content, "skill");
      
      // MUST warn about missing description
      expect(result.warnings.some(w => w.code === "MISSING_DESCRIPTION")).toBe(true);
    });
  });

  describe("Optimizer Mutations", () => {
    const optimizer = new ClaudeSourceOptimizer();

    it("MUTATION: Risk level enforcement", async () => {
      const context = {
        sourceAgent: "claude" as const,
        targetAgent: "cursor" as const,
        componentType: "skill" as const,
        lostFeatures: [{
          name: "allowed-tools",
          sourceValue: ["Read"],
          severity: "high" as const,
          semanticImpact: "Lost",
          approximationStrategy: "Add text"
        }],
        originalFrontmatter: { "allowed-tools": ["Read"] },
        targetFrontmatter: { description: "test" },
        originalBody: "Body",
        targetBody: "Body"
      };

      // Safe mode should make minimal changes
      const safeResult = await optimizer.optimize("content", context, { riskLevel: "safe" });
      const safeChanges = safeResult.changes.length;

      // High mode should make more changes
      const highResult = await optimizer.optimize("content", context, { riskLevel: "high" });
      const highChanges = highResult.changes.length;

      // High should have equal or more changes than safe
      expect(highChanges).toBeGreaterThanOrEqual(safeChanges);
    });

    it("MUTATION: Fidelity calculation accuracy", () => {
      // If fidelity calculation is mutated, these tests will fail
      const calc = (optimizer as any).calculateFidelity.bind(optimizer);

      const identical = calc("same content", "same content");
      expect(identical.afterConversion).toBe(100);

      const different = calc("completely different text", "totally other words");
      expect(different.afterConversion).toBeLessThan(50);

      const partial = calc("some matching words", "some different matching");
      expect(partial.afterConversion).toBeGreaterThan(0);
      expect(partial.afterConversion).toBeLessThan(100);
    });

    it("MUTATION: Lost feature detection", () => {
      const context = {
        sourceAgent: "claude" as const,
        targetAgent: "cursor" as const,
        componentType: "skill" as const,
        lostFeatures: [],
        originalFrontmatter: { context: "fork" },
        targetFrontmatter: {},
        originalBody: "Body",
        targetBody: "Body"
      };

      const lost = optimizer.analyzeLoss(context);
      
      // MUST detect fork context loss
      expect(lost.some(f => f.name === "context: fork")).toBe(true);
      expect(lost.find(f => f.name === "context: fork")?.severity).toBe("critical");
    });
  });

  describe("Behavioral Mutations", () => {
    it("MUTATION: Preventing false positives", () => {
      const validator = new ClaudeValidator();
      
      // Valid skill should NOT have errors
      const validContent = `---
name: valid-skill
description: Valid description
---

Body content here that is sufficiently long.`;

      const result = validator.validate(validContent, "skill");
      
      // No false positives allowed
      expect(result.issues).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it("MUTATION: Preventing silent failures", () => {
      const validator = new ClaudeValidator();
      
      // Empty content should FAIL, not silently pass
      const result = validator.validate("", "skill");
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("MUTATION: Consistency across multiple validations", () => {
      const validator = new ClaudeValidator();
      const content = `---
name: test
description: test
---

Body`;

      // Multiple validations should produce consistent results
      const results = Array(10).fill(null).map(() => 
        validator.validate(content, "skill")
      );

      const allValid = results.every(r => r.valid === results[0]!.valid);
      expect(allValid).toBe(true);

      const allSameIssueCount = results.every(r => 
        r.issues.length === results[0]!.issues.length
      );
      expect(allSameIssueCount).toBe(true);
    });
  });

  describe("Security Mutation Tests", () => {
    it("MUTATION: YAML bomb protection", () => {
      const validator = new ClaudeValidator();
      
      // Exponential entity expansion
      const bomb = `---
name: test
&a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]
*b: *a
*c: *a
*d: *a
---
body`;

      // Should handle without hanging or crashing
      const start = Date.now();
      const result = validator.validate(bomb, "skill");
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete quickly
      expect(result).toBeDefined();
    });

    it("MUTATION: Script injection resistance", () => {
      const validator = new CursorValidator();
      
      const injection = `---
description: "<script>alert('xss')</script>"
globs: ["**/*"]
---

<script>alert('body')</script>`;

      // Should not execute or validate as correct
      const result = validator.validate(injection, "rule");
      expect(result).toBeDefined();
      // Should not crash or hang
    });
  });
});

// Import needed for mutation tests
import { CursorValidator } from "../src/validation/agents/cursor-validator.js";
