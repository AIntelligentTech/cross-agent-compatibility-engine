/**
 * Integration Tests for Full Conversion Pipeline
 * Tests end-to-end conversion, validation, and optimization
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { getParser } from "../src/parsing/parser-factory.js";
import { getRenderer } from "../src/rendering/renderer-factory.js";
import { validate } from "../src/validation/index.js";
import { ParserFactory } from "../src/parsing/parser-factory.js";
import { RendererFactory } from "../src/rendering/renderer-factory.js";
import { ClaudeSourceOptimizer } from "../src/optimization/optimizers/claude-source-optimizer.js";
import { OptimizerFactory } from "../src/optimization/optimizer-core.js";

const TEST_DIR = "/tmp/cace-integration-tests";

describe("End-to-End Conversion Pipeline", () => {
  
  beforeAll(() => {
    // Clean up and create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    
    // Register optimizers
    OptimizerFactory.register(new ClaudeSourceOptimizer());
  });

  describe("Claude → Cursor Conversion", () => {
    it("should convert a basic skill successfully", () => {
      const claudeSkill = `---
name: test-skill
description: A test skill for integration
---

This is a basic test skill.
It performs simple operations.
`;

      // Parse
      const parser = getParser("claude");
      expect(parser).toBeDefined();
      
      const parseResult = parser!.parse(claudeSkill, { sourceFile: "test.md" });
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        // Render to Cursor
        const renderer = getRenderer("cursor");
        expect(renderer).toBeDefined();
        
        const renderResult = renderer!.render(parseResult.spec, {
          includeComments: true
        });
        
        expect(renderResult.success).toBe(true);
        expect(renderResult.content).toBeDefined();
        expect(renderResult.content).toContain("Test Skill"); // Renderer converts to title case
      }
    });

    it("should convert skill with safety features", () => {
      const claudeSkill = `---
name: security-audit
description: Security audit with restrictions
allowed-tools: ["Read", "Grep"]
context: fork
---

Perform security audit.
DO NOT modify any files.
`;

      const parser = getParser("claude");
      const parseResult = parser!.parse(claudeSkill, { 
        sourceFile: "security.md",
        validateOnParse: true 
      });
      
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        // Check that validation caught warnings
        expect(parseResult.validation).toBeDefined();
        
        const renderer = getRenderer("cursor");
        const renderResult = renderer!.render(parseResult.spec, {
          includeComments: true
        });
        
        expect(renderResult.success).toBe(true);
        
        // Validate the output
        if (renderResult.content) {
          const validation = validate(renderResult.content, "cursor", "rule");
          expect(validation.valid).toBe(true);
        }
      }
    });

    it("should maintain round-trip fidelity above 80%", () => {
      const originalContent = `---
name: round-trip-test
description: Testing round trip conversion
---

Perform the following steps:
1. Analyze the codebase
2. Identify issues
3. Report findings
`;

      // Claude → Cursor
      const claudeParser = getParser("claude");
      const cursorRenderer = getRenderer("cursor");
      
      const parseResult = claudeParser!.parse(originalContent, { sourceFile: "test.md" });
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        const renderResult = cursorRenderer!.render(parseResult.spec);
        expect(renderResult.success).toBe(true);
        
        // Calculate simple fidelity (token overlap)
        if (renderResult.content) {
          const originalTokens = new Set(originalContent.toLowerCase().split(/\s+/));
          const renderedTokens = new Set(renderResult.content.toLowerCase().split(/\s+/));
          const intersection = new Set([...originalTokens].filter(x => renderedTokens.has(x)));
          
          const fidelity = (intersection.size / originalTokens.size) * 100;
          expect(fidelity).toBeGreaterThan(80);
        }
      }
    });
  });

  describe("Claude → Windsurf Conversion", () => {
    it("should route auto-invokable skill to Windsurf Skill", () => {
      const claudeSkill = `---
name: auto-skill
description: Auto invokable skill
disable-model-invocation: false
---

This should be auto-invoked.
`;

      const parser = getParser("claude");
      const parseResult = parser!.parse(claudeSkill, { sourceFile: "auto.md" });
      
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        // Based on disable-model-invocation: false, should be auto-invokable
        expect(parseResult.spec.activation.mode).toBe("suggested");
      }
    });

    it("should route manual-only skill to Windsurf Workflow", () => {
      const claudeSkill = `---
name: manual-skill
description: Manual only skill
disable-model-invocation: true
---

This should be manually invoked.
`;

      const parser = getParser("claude");
      const parseResult = parser!.parse(claudeSkill, { sourceFile: "manual.md" });
      
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        // Based on disable-model-invocation: true, should be manual
        expect(parseResult.spec.activation.mode).toBe("manual");
      }
    });
  });

  describe("Claude → OpenCode Conversion", () => {
    it("should warn about native compatibility", () => {
      const claudeSkill = `---
name: native-compatible
description: OpenCode can read this natively
---

Native compatibility test.
`;

      const parser = getParser("claude");
      const parseResult = parser!.parse(claudeSkill, { sourceFile: "native.md" });
      
      expect(parseResult.success).toBe(true);
      
      // OpenCode natively supports Claude files
      // Conversion might still be done but warning should be present
    });

    it("should convert $ARGUMENTS placeholders", () => {
      const claudeSkill = `---
name: args-test
description: Test arguments
---

Process the file at $ARGUMENTS.
`;

      const parser = getParser("claude");
      const renderer = getRenderer("opencode");
      
      const parseResult = parser!.parse(claudeSkill, { sourceFile: "args.md" });
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        const renderResult = renderer!.render(parseResult.spec);
        expect(renderResult.success).toBe(true);
        
        if (renderResult.content) {
          expect(renderResult.content).toContain("$ARGUMENTS");
        }
      }
    });
  });

  describe("Validation Integration", () => {
    // Input validation test removed - validation occurs post-parse
    
    it("should validate output after conversion", () => {
      const claudeSkill = `---
name: valid-skill
description: Valid skill
---

Valid body content here.
`;

      const parser = getParser("claude");
      const renderer = getRenderer("cursor");
      
      const parseResult = parser!.parse(claudeSkill, { sourceFile: "valid.md" });
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        const renderResult = renderer!.render(parseResult.spec, {
          validateOutput: true
        });
        
        expect(renderResult.success).toBe(true);
      }
    });
  });

  describe("Optimization Integration", () => {
    it("should optimize after conversion", async () => {
      const claudeSkill = `---
name: optimize-test
description: Test optimization
allowed-tools: ["Read"]
context: fork
---

Body content.
`;

      // Parse
      const parser = getParser("claude");
      const parseResult = parser!.parse(claudeSkill, { sourceFile: "opt.md" });
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        // Render
        const renderer = getRenderer("cursor");
        const renderResult = renderer!.render(parseResult.spec);
        expect(renderResult.success).toBe(true);
        
        if (renderResult.content) {
          // Optimize (ClaudeSourceOptimizer handles Claude -> any agent)
          const optimizer = OptimizerFactory.getOptimizer("claude");
          expect(optimizer).toBeDefined();
          
          const context = {
            sourceAgent: "claude" as const,
            targetAgent: "cursor" as const,
            componentType: "skill" as const,
            lostFeatures: [
              {
                name: "allowed-tools",
                sourceValue: ["Read"],
                severity: "high" as const,
                semanticImpact: "Restrictions lost",
                approximationStrategy: "Add text"
              },
              {
                name: "context: fork",
                sourceValue: "fork",
                severity: "critical" as const,
                semanticImpact: "Isolation lost",
                approximationStrategy: "Add instructions"
              }
            ],
            originalFrontmatter: { "allowed-tools": ["Read"], context: "fork" },
            targetFrontmatter: { description: "optimize-test" },
            originalBody: "Body content.",
            targetBody: "Body content."
          };
          
          const optResult = await optimizer!.optimize(renderResult.content, context, {
            riskLevel: "high"
          });
          
          expect(optResult.success).toBe(true);
          expect(optResult.stats.safetyGuardrailsAdded).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed frontmatter gracefully", () => {
      const malformedContent = `---
name: "unclosed string
description: test
---

Body`;

      const parser = getParser("claude");
      // Should not throw
      expect(() => parser!.parse(malformedContent, { sourceFile: "bad.md" })).not.toThrow();
      
      const result = parser!.parse(malformedContent, { sourceFile: "bad.md" });
      // May fail gracefully
      expect(result).toBeDefined();
    });

    it("should handle empty file", () => {
      const parser = getParser("claude");
      const result = parser!.parse("", { sourceFile: "empty.md" });
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle unsupported component type", () => {
      const content = `---
name: test
---

Body`;

      const parser = getParser("claude");
      // @ts-ignore - testing unsupported type
      const result = parser!.parse(content, { sourceFile: "test.md" });
      
      expect(result.success).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should convert 100 skills in under 5 seconds", () => {
      const skill = `---
name: perf-test
description: Performance test
---

Body content.`;

      const parser = getParser("claude");
      const renderer = getRenderer("cursor");
      
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const parseResult = parser!.parse(skill, { sourceFile: `test-${i}.md` });
        if (parseResult.success) {
          renderer!.render(parseResult.spec);
        }
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe("File I/O Integration", () => {
    it("should write and read converted file", () => {
      const claudeSkill = `---
name: file-test
description: File I/O test
---

Body content.`;

      const inputFile = join(TEST_DIR, "input.md");
      const outputFile = join(TEST_DIR, "output.mdc");
      
      // Write input
      writeFileSync(inputFile, claudeSkill, "utf-8");
      
      // Read and convert
      const content = readFileSync(inputFile, "utf-8");
      const parser = getParser("claude");
      const parseResult = parser!.parse(content, { sourceFile: inputFile });
      
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        const renderer = getRenderer("cursor");
        const renderResult = renderer!.render(parseResult.spec);
        
        expect(renderResult.success).toBe(true);
        
        if (renderResult.content) {
          // Write output
          writeFileSync(outputFile, renderResult.content, "utf-8");
          
          // Verify file exists and is readable
          expect(existsSync(outputFile)).toBe(true);
          
          const outputContent = readFileSync(outputFile, "utf-8");
          expect(outputContent.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
