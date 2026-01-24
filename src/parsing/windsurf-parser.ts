/**
 * Parser for Windsurf (Cascade) workflows
 * 
 * Windsurf workflows use YAML frontmatter with:
 * - description: short summary
 * - auto_execution_mode: numeric activation setting (optional)
 */

import matter from 'gray-matter';
import type { ComponentSpec, CapabilitySet, SemanticVersion } from '../core/types.js';
import { createDefaultCapabilities, parseVersion } from '../core/types.js';
import { BaseParser, type ParserOptions } from './parser-interface.js';

interface WindsurfFrontmatter {
  description?: string;
  auto_execution_mode?: number;
  version?: string;
  tags?: string[];
}

export class WindsurfParser extends BaseParser {
  readonly agentId = 'windsurf' as const;

  canParse(content: string, filename?: string): boolean {
    if (filename) {
      if (filename.includes('.windsurf/workflows/') || filename.includes('.windsurf/rules/')) {
        return true;
      }
    }

    // Check for Windsurf-specific patterns
    try {
      const { data } = matter(content);
      const fm = data as WindsurfFrontmatter;
      // Windsurf typically has description and optionally auto_execution_mode
      return fm.description !== undefined && fm.auto_execution_mode !== undefined;
    } catch {
      return false;
    }
  }

  parse(content: string, options?: ParserOptions): ReturnType<typeof this.createSuccessResult> | ReturnType<typeof this.createErrorResult> {
    const warnings: string[] = [];

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(content);
    } catch (err) {
      return this.createErrorResult([`Failed to parse frontmatter: ${err instanceof Error ? err.message : String(err)}`]);
    }

    const fm = parsed.data as WindsurfFrontmatter;
    const body = parsed.content.trim();

    // Extract ID from filename
    const id = this.extractIdFromFilename(options?.sourceFile) ?? 'unknown-workflow';

    // Determine component type from path
    const componentType = options?.sourceFile?.includes('/rules/') ? 'rule' : 'workflow';

    // Parse version
    const version: SemanticVersion = fm.version ? parseVersion(fm.version) : { major: 1, minor: 0, patch: 0 };

    // Map auto_execution_mode to activation mode
    const activationMode = this.mapAutoExecutionMode(fm.auto_execution_mode);

    // Infer capabilities from body content
    const capabilities = options?.inferCapabilities !== false
      ? this.inferCapabilities(body)
      : createDefaultCapabilities();

    // Build the ComponentSpec
    const spec: ComponentSpec = {
      id,
      version,
      sourceAgent: {
        id: 'windsurf',
        detectedAt: new Date().toISOString(),
      },
      componentType,
      category: fm.tags ?? this.inferCategory(fm.description, body),
      intent: {
        summary: fm.description ?? `Windsurf ${componentType}: ${id}`,
        purpose: fm.description ?? 'No description provided',
        whenToUse: fm.description,
      },
      activation: {
        mode: activationMode,
        safetyLevel: this.inferSafetyLevel(body, capabilities),
        requiresConfirmation: activationMode === 'manual',
      },
      invocation: {
        slashCommand: id,
        userInvocable: true,
      },
      execution: {
        context: 'main',
      },
      body,
      capabilities,
      metadata: {
        sourceFile: options?.sourceFile,
        originalFormat: `windsurf-${componentType}`,
        updatedAt: new Date().toISOString(),
        tags: fm.tags,
      },
    };

    // Add warnings for Windsurf-specific features
    if (fm.auto_execution_mode !== undefined && fm.auto_execution_mode > 0) {
      warnings.push(`auto_execution_mode=${fm.auto_execution_mode} may not have direct equivalents in other agents`);
    }

    return this.createSuccessResult(spec, warnings);
  }

  private extractIdFromFilename(filename?: string): string | undefined {
    if (!filename) return undefined;

    // Extract from .windsurf/workflows/<name>.md
    const workflowMatch = filename.match(/\.windsurf\/workflows\/([^/]+)\.md$/);
    if (workflowMatch?.[1]) return workflowMatch[1];

    // Extract from .windsurf/rules/<name>.md
    const ruleMatch = filename.match(/\.windsurf\/rules\/([^/]+)\.md$/);
    if (ruleMatch?.[1]) return ruleMatch[1];

    return undefined;
  }

  private mapAutoExecutionMode(mode?: number): 'manual' | 'suggested' | 'auto' | 'contextual' {
    if (mode === undefined || mode === 0) return 'manual';
    if (mode === 1) return 'suggested';
    if (mode === 2) return 'contextual';
    if (mode >= 3) return 'auto';
    return 'manual';
  }

  private inferCapabilities(body: string): CapabilitySet {
    const caps = createDefaultCapabilities();
    const lowerBody = body.toLowerCase();

    // Infer from body content and tool references
    caps.needsShell = lowerBody.includes('run_command') || lowerBody.includes('terminal') || lowerBody.includes('shell');
    caps.needsGit = lowerBody.includes('git') || lowerBody.includes('commit') || lowerBody.includes('branch');
    caps.needsNetwork = lowerBody.includes('http') || lowerBody.includes('api') || lowerBody.includes('fetch') || lowerBody.includes('read_url');
    caps.needsBrowser = lowerBody.includes('browser') || lowerBody.includes('browser_preview');
    caps.needsCodeSearch = lowerBody.includes('code_search') || lowerBody.includes('grep_search') || lowerBody.includes('find_by_name');
    caps.needsFilesystem = lowerBody.includes('read_file') || lowerBody.includes('write_to_file') || lowerBody.includes('edit') || lowerBody.includes('list_dir');

    // Infer what it provides
    caps.providesAnalysis = lowerBody.includes('analyz') || lowerBody.includes('review') || lowerBody.includes('audit') || lowerBody.includes('investigate');
    caps.providesCodeGeneration = lowerBody.includes('implement') || lowerBody.includes('create') || lowerBody.includes('generate') || lowerBody.includes('code');
    caps.providesRefactoring = lowerBody.includes('refactor') || lowerBody.includes('restructure');
    caps.providesDocumentation = lowerBody.includes('document') || lowerBody.includes('readme') || lowerBody.includes('spec');

    return caps;
  }

  private inferCategory(description?: string, body?: string): string[] {
    const categories: string[] = [];
    const text = `${description ?? ''} ${body ?? ''}`.toLowerCase();

    if (text.includes('architect')) categories.push('architecture');
    if (text.includes('design')) categories.push('design');
    if (text.includes('test')) categories.push('testing');
    if (text.includes('debug')) categories.push('debugging');
    if (text.includes('refactor')) categories.push('refactoring');
    if (text.includes('document')) categories.push('documentation');
    if (text.includes('security')) categories.push('security');
    if (text.includes('performance') || text.includes('optimi')) categories.push('performance');
    if (text.includes('iterate')) categories.push('iteration');
    if (text.includes('think') || text.includes('reason')) categories.push('reasoning');

    return categories.length > 0 ? categories : ['general'];
  }

  private inferSafetyLevel(body: string, capabilities: CapabilitySet): 'safe' | 'sensitive' | 'dangerous' {
    const lowerBody = body.toLowerCase();

    if (
      lowerBody.includes('delete') ||
      lowerBody.includes('remove') ||
      lowerBody.includes('drop') ||
      capabilities.needsShell
    ) {
      return 'dangerous';
    }

    if (
      capabilities.needsNetwork ||
      capabilities.needsGit ||
      lowerBody.includes('modify') ||
      lowerBody.includes('edit')
    ) {
      return 'sensitive';
    }

    return 'safe';
  }
}
