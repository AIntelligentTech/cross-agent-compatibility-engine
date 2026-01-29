/**
 * Parser for Google Gemini CLI skills and commands
 * Based on Gemini documentation from https://geminicli.com/
 */

import type { AgentId, ComponentSpec, ComponentType, ParseResult, SemanticVersion } from "../core/types.js";
import { parseVersion } from "../core/types.js";
import matter from "gray-matter";
import { BaseParser } from "./parser-interface.js";

interface GeminiFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  // Built-in tools
  code_execution?: boolean;
  google_search?: boolean;
  // Multi-directory support
  include_directories?: string[];
  // Agent configuration
  instruction?: string;
  // Command-specific
  slash_command?: string;
  // Skill examples
  examples?: string[];
  // AGENTS.md compatibility
  globs?: string | string[];
}

export class GeminiParser extends BaseParser {
  readonly agentId: AgentId = "gemini";
  readonly supportedVersions: SemanticVersion[] = [
    { major: 1, minor: 0, patch: 0 },
    { major: 1, minor: 1, patch: 0 },
  ];

  canParse(content: string, filename?: string): boolean {
    // Check filename patterns first
    if (filename) {
      if (filename.includes(".gemini/")) return true;
      if (filename.includes("GEMINI.md")) return true;
    }

    // Check content patterns for Gemini-specific fields
    const hasGeminiFields = 
      /code_execution\s*:/m.test(content) ||
      /google_search\s*:/m.test(content) ||
      /temperature\s*:/m.test(content) ||
      /include_directories\s*:/m.test(content);
    
    // Check for standard skill pattern but not other agents
    const hasSkillPattern = /---\s*\n.*name:.*\n.*description:/s.test(content);
    
    return hasGeminiFields || (hasSkillPattern && !this.isOtherAgentFormat(content));
  }

  private isOtherAgentFormat(content: string): boolean {
    // Check for other agents' unique fields
    const otherAgentFields = [
      /type:\s*(skill|workflow|rule)/,  // Windsurf
      /context:\s*fork/,  // Claude
      /subtask:\s*true/,  // OpenCode
      /approval_policy\s*=/,  // Codex (TOML)
      /sandbox_mode\s*=/,  // Codex (TOML)
    ];
    
    return otherAgentFields.some(pattern => pattern.test(content));
  }

  parse(
    content: string,
    options?: { sourceFile?: string; validateOnParse?: boolean },
  ): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse frontmatter
      const parsed = matter(content);
      const fm = parsed.data as GeminiFrontmatter;
      const body = parsed.content.trim();

      // Detect component type
      const componentType = this.detectComponentType(fm, body, options?.sourceFile);

      // Build component spec
      const spec: ComponentSpec = {
        id: fm.name || this.extractIdFromFilename(options?.sourceFile) || "unnamed",
        componentType,
        sourceAgent: { id: this.agentId },
        version: fm.version ? parseVersion(fm.version) : { major: 1, minor: 0, patch: 0 },
        
        intent: {
          summary: fm.description || this.extractDescriptionFromBody(body) || "",
          purpose: body,
          examples: fm.examples || this.extractExamples(body),
        },
        
        activation: {
          mode: this.detectActivationMode(fm, body),
          safetyLevel: this.detectSafetyLevel(fm),
          triggers: this.extractTriggers(fm, body),
        },
        
        invocation: {
          userInvocable: !!fm.slash_command || componentType === "command",
          slashCommand: fm.slash_command,
        },
        
        execution: {
          context: "main",
          allowedTools: fm.tools,
          preferredModel: fm.model,
        },
        
        capabilities: {
          needsShell: fm.code_execution || false,
          needsFilesystem: true,
          needsNetwork: fm.google_search || false,
          needsGit: false,
          needsCodeSearch: true,
          needsBrowser: fm.google_search || false,
          providesAnalysis: true,
          providesCodeGeneration: true,
          providesRefactoring: true,
          providesDocumentation: true,
        },
        
        body,
        metadata: {},
      };

      // Add Gemini-specific metadata
      if (fm.model) {
        spec.metadata.model = fm.model;
      }
      if (fm.temperature !== undefined) {
        spec.metadata.temperature = fm.temperature;
      }
      if (fm.max_tokens) {
        spec.metadata.maxTokens = fm.max_tokens;
      }
      if (fm.code_execution) {
        spec.metadata.codeExecution = fm.code_execution;
      }
      if (fm.google_search) {
        spec.metadata.googleSearch = fm.google_search;
      }
      if (fm.include_directories) {
        spec.metadata.includeDirectories = fm.include_directories;
      }
      if (fm.instruction) {
        spec.metadata.instruction = fm.instruction;
      }
      if (fm.tools) {
        spec.metadata.tools = fm.tools;
      }

      return {
        success: true,
        spec,
        errors,
        warnings,
      };
    } catch (err) {
      return {
        success: false,
        errors: [err instanceof Error ? err.message : "Parse error"],
        warnings,
      };
    }
  }

  private detectComponentType(
    fm: GeminiFrontmatter,
    body: string,
    filename?: string
  ): ComponentType {
    // Check filename patterns
    if (filename) {
      if (filename.includes("/skills/") || filename.includes("SKILL.md")) {
        return "skill";
      }
      if (filename.includes("/commands/")) {
        return "command";
      }
      if (filename.includes("/memory/")) {
        return "memory";
      }
    }

    // Check frontmatter hints
    if (fm.slash_command) {
      return "command";
    }
    if (fm.instruction || fm.examples) {
      return "skill";
    }

    // Detect memory by short body and lack of instruction/examples
    if (body.length < 500 && !fm.instruction && !fm.examples) {
      return "memory";
    }

    // Default to skill
    return "skill";
  }

  private extractIdFromFilename(filename?: string): string | undefined {
    if (!filename) return undefined;
    
    // Extract from path like .gemini/skills/my-skill/SKILL.md
    const match = filename.match(/[/\\]([^/\\]+)[/\\]?(?:SKILL)?\.md$/i);
    if (match) {
      return match[1];
    }
    
    // Extract from GEMINI.md
    if (filename.includes("GEMINI.md")) {
      return "gemini-config";
    }
    
    return undefined;
  }

  private extractDescriptionFromBody(body: string): string | undefined {
    // Extract first paragraph as description
    const lines = body.split("\n").filter(line => line.trim());
    if (lines.length > 0) {
      const firstContent = lines.find(line => !line.startsWith("#"));
      if (firstContent) {
        return firstContent.trim().slice(0, 200);
      }
    }
    return undefined;
  }

  private extractExamples(body: string): string[] {
    const examples: string[] = [];
    
    // Look for example sections
    const exampleMatch = body.match(/##?\s*(?:Examples?|Usage)/i);
    if (exampleMatch) {
      const afterHeader = body.slice(exampleMatch.index! + exampleMatch[0].length);
      const codeBlocks = afterHeader.match(/```[\s\S]*?```/g);
      if (codeBlocks) {
        examples.push(...codeBlocks.slice(0, 3));
      }
    }
    
    return examples;
  }

  private detectActivationMode(
    fm: GeminiFrontmatter,
    _body: string
  ): "manual" | "suggested" | "auto" | "contextual" | "hooked" {
    if (fm.globs) {
      return "contextual";
    }
    if (fm.slash_command) {
      return "manual";
    }
    return "suggested";
  }

  private detectSafetyLevel(fm: GeminiFrontmatter): "safe" | "sensitive" | "dangerous" {
    // Gemini has built-in code execution which can be sensitive
    if (fm.code_execution) {
      return "sensitive";
    }
    if (fm.tools?.includes("code_execution") || fm.tools?.includes("shell")) {
      return "sensitive";
    }
    return "safe";
  }

  private extractTriggers(
    fm: GeminiFrontmatter,
    _body: string
  ): Array<{ type: "glob" | "keyword" | "context" | "hook"; pattern?: string; keywords?: string[]; hookName?: string }> {
    const triggers: Array<{ type: "glob" | "keyword" | "context" | "hook"; pattern?: string; keywords?: string[]; hookName?: string }> = [];
    
    if (fm.globs) {
      const globs = Array.isArray(fm.globs) ? fm.globs : [fm.globs];
      globs.forEach(glob => {
        triggers.push({ type: "glob", pattern: glob });
      });
    }
    
    return triggers;
  }

  private extractDependencies(fm: GeminiFrontmatter): string[] {
    const deps: string[] = [];
    
    if (fm.tools) {
      deps.push(...fm.tools);
    }
    if (fm.code_execution) {
      deps.push("code_execution");
    }
    if (fm.google_search) {
      deps.push("google_search");
    }
    
    return deps;
  }

  private extractRequirements(fm: GeminiFrontmatter): string[] {
    const reqs: string[] = [];
    
    if (fm.model) {
      reqs.push(`Model: ${fm.model}`);
    }
    if (fm.temperature !== undefined) {
      reqs.push(`Temperature: ${fm.temperature}`);
    }
    if (fm.max_tokens) {
      reqs.push(`Max tokens: ${fm.max_tokens}`);
    }
    if (fm.include_directories) {
      reqs.push(`Directories: ${fm.include_directories.join(", ")}`);
    }
    
    return reqs;
  }
}
