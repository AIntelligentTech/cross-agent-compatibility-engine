/**
 * Parser for OpenAI Codex skills and commands
 * Based on Codex documentation from https://developers.openai.com/codex/
 */

import type { AgentId, ComponentSpec, ComponentType, ParseResult, SemanticVersion } from "../core/types.js";
import { parseVersion, formatVersion } from "../core/types.js";
import matter from "gray-matter";
import { BaseParser } from "./parser-interface.js";

interface CodexFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  model?: string;
  approval_policy?: "untrusted" | "on-failure" | "on-request" | "never";
  sandbox_mode?: "read-only" | "workspace-write" | "danger-full-access";
  web_search?: "disabled" | "cached" | "live";
  mcp_servers?: Record<string, unknown>;
  tools?: string[];
  features?: Record<string, boolean>;
  // Skill-specific fields
  prompt?: string;
  instruction?: string;
  // Command-specific fields  
  slash_command?: string;
  argument_hint?: string;
  // AGENTS.md compatibility
  globs?: string | string[];
  alwaysApply?: boolean;
}

export class CodexParser extends BaseParser {
  readonly agentId: AgentId = "codex";
  readonly supportedVersions: SemanticVersion[] = [
    { major: 1, minor: 0, patch: 0 },
    { major: 1, minor: 1, patch: 0 },
  ];

  canParse(content: string, filename?: string): boolean {
    // Check filename patterns first
    if (filename) {
      if (filename.includes(".codex/")) return true;
      if (filename.includes("CODEX.md")) return true;
    }

    // Check content patterns
    // Codex uses TOML frontmatter or YAML frontmatter with Codex-specific fields
    const hasCodexFields = 
      /approval_policy\s*=/m.test(content) ||
      /sandbox_mode\s*=/m.test(content) ||
      /mcp_servers\s*=/m.test(content) ||
      /web_search\s*=/m.test(content);
    
    // Check for skill.md patterns
    const hasSkillPattern = /---\s*\n.*name:.*\n.*description:/s.test(content);
    
    return hasCodexFields || (hasSkillPattern && !this.isOtherAgentFormat(content));
  }

  private isOtherAgentFormat(content: string): boolean {
    // Check for other agents' unique fields to avoid false positives
    const otherAgentFields = [
      /type:\s*(skill|workflow|rule)/,  // Windsurf
      /context:\s*fork/,  // Claude
      /subtask:\s*true/,  // OpenCode
      /mode:\s*(primary|subagent)/,  // OpenCode
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
      const fm = parsed.data as CodexFrontmatter;
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
          examples: this.extractExamples(body),
        },
        
        activation: {
          mode: this.detectActivationMode(fm, body),
          safetyLevel: this.detectSafetyLevel(fm),
          triggers: this.extractTriggers(fm, body),
        },
        
        invocation: {
          userInvocable: !!fm.slash_command || componentType === "command",
          slashCommand: fm.slash_command,
          argumentHint: fm.argument_hint,
        },
        
        execution: {
          context: fm.sandbox_mode === "danger-full-access" ? "isolated" : "main",
          allowedTools: fm.tools,
          preferredModel: fm.model,
        },
        
        capabilities: {
          needsShell: fm.sandbox_mode === "danger-full-access" || fm.sandbox_mode === "workspace-write",
          needsFilesystem: true,
          needsNetwork: fm.web_search === "live" || fm.sandbox_mode === "danger-full-access",
          needsGit: false,
          needsCodeSearch: true,
          needsBrowser: fm.web_search !== "disabled",
          providesAnalysis: true,
          providesCodeGeneration: true,
          providesRefactoring: true,
          providesDocumentation: true,
        },
        
        body,
        metadata: {},
      };

      // Add Codex-specific metadata
      if (fm.model) {
        spec.metadata.model = fm.model;
      }
      if (fm.approval_policy) {
        spec.metadata.approvalPolicy = fm.approval_policy;
      }
      if (fm.sandbox_mode) {
        spec.metadata.sandboxMode = fm.sandbox_mode;
      }
      if (fm.web_search) {
        spec.metadata.webSearch = fm.web_search;
      }
      if (fm.mcp_servers) {
        spec.metadata.mcpServers = fm.mcp_servers;
      }
      if (fm.tools) {
        spec.metadata.allowedTools = fm.tools;
      }
      if (fm.features) {
        spec.metadata.features = fm.features;
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
    fm: CodexFrontmatter,
    _body: string,
    filename?: string
  ): ComponentType {
    // Check filename patterns
    if (filename) {
      if (filename.includes("/skills/") || filename.includes("SKILL.md")) {
        return "skill";
      }
      if (filename.includes("/commands/") || filename.includes("COMMAND.md")) {
        return "command";
      }
      if (filename.includes("/rules/")) {
        return "rule";
      }
      if (filename.includes("/memory/")) {
        return "memory";
      }
    }

    // Check frontmatter hints
    if (fm.slash_command || fm.argument_hint) {
      return "command";
    }
    if (fm.globs || fm.alwaysApply !== undefined) {
      return "rule";
    }
    if (fm.prompt || fm.instruction) {
      return "skill";
    }

    // Default to skill
    return "skill";
  }

  private extractIdFromFilename(filename?: string): string | undefined {
    if (!filename) return undefined;
    
    // Extract from path like .codex/skills/my-skill/SKILL.md
    const match = filename.match(/[/\\]([^/\\]+)[/\\]?(?:SKILL|COMMAND)?\.md$/i);
    if (match) {
      return match[1];
    }
    
    // Extract from CODEX.md
    if (filename.includes("CODEX.md")) {
      return "codex-config";
    }
    
    return undefined;
  }

  private extractDescriptionFromBody(body: string): string | undefined {
    // Extract first paragraph or heading as description
    const lines = body.split("\n").filter(line => line.trim());
    if (lines.length > 0) {
      // Skip markdown headings
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
      // Extract code blocks or list items
      const codeBlocks = afterHeader.match(/```[\s\S]*?```/g);
      if (codeBlocks) {
        examples.push(...codeBlocks.slice(0, 3));
      }
    }
    
    return examples;
  }

  private detectActivationMode(
    fm: CodexFrontmatter,
    _body: string
  ): "manual" | "suggested" | "auto" | "contextual" | "hooked" {
    // Check globs for auto/contextual activation
    if (fm.globs) {
      return "contextual";
    }
    
    // Check alwaysApply
    if (fm.alwaysApply) {
      return "auto";
    }
    
    // Check slash command for manual activation
    if (fm.slash_command) {
      return "manual";
    }
    
    // Default to suggested for skills
    return "suggested";
  }

  private detectSafetyLevel(fm: CodexFrontmatter): "safe" | "sensitive" | "dangerous" {
    if (fm.sandbox_mode === "danger-full-access") {
      return "dangerous";
    }
    if (fm.approval_policy === "never") {
      return "dangerous";
    }
    if (fm.sandbox_mode === "workspace-write") {
      return "sensitive";
    }
    return "safe";
  }

  private extractTriggers(
    fm: CodexFrontmatter,
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

  private extractDependencies(fm: CodexFrontmatter): string[] {
    const deps: string[] = [];
    
    // MCP servers are dependencies
    if (fm.mcp_servers) {
      deps.push(...Object.keys(fm.mcp_servers));
    }
    
    // Tools are dependencies
    if (fm.tools) {
      deps.push(...fm.tools);
    }
    
    return deps;
  }

  private extractRequirements(fm: CodexFrontmatter): string[] {
    const reqs: string[] = [];
    
    if (fm.model) {
      reqs.push(`Model: ${fm.model}`);
    }
    if (fm.approval_policy) {
      reqs.push(`Approval: ${fm.approval_policy}`);
    }
    if (fm.sandbox_mode) {
      reqs.push(`Sandbox: ${fm.sandbox_mode}`);
    }
    
    return reqs;
  }
}
