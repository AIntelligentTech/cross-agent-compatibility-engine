/**
 * Claude Memory Parser - Parses CLAUDE.md and .claude/rules/*.md files
 * 
 * Claude Code uses CLAUDE.md for project context with support for:
 * - @path/to/file imports
 * - Hierarchical rules in .claude/rules/
 * - Path-specific rules with YAML frontmatter
 */

import matter from 'gray-matter';
import type { AgentId, ComponentSpec, ParseResult, ImportSpec, MemorySection, ScopeLevel } from '../../core/types.js';
import { DEFAULT_VERSION } from '../../core/constants.js';
import { createDefaultCapabilities } from '../../core/types.js';

export interface ClaudeMemoryParseContext {
  sourceFile?: string;
  sourcePath?: string;
  resolveImports?: boolean;
}

/**
 * Detect if content is a Claude memory file
 */
export function isClaudeMemory(content: string, context?: ClaudeMemoryParseContext): boolean {
  if (context?.sourceFile) {
    const file = context.sourceFile;
    if (file.endsWith('CLAUDE.md') || file.endsWith('CLAUDE.local.md')) {
      return true;
    }
    if (file.includes('.claude/rules/') && file.endsWith('.md')) {
      return true;
    }
  }
  
  // Check for Claude-specific patterns
  const hasClaudeImports = /@[a-zA-Z0-9_\-./]+/.test(content);
  const hasClaudeHeader = /^#\s*CLAUDE/im.test(content);
  
  return hasClaudeHeader || (hasClaudeImports && !content.includes('AGENTS.md'));
}

/**
 * Extract @imports from content
 */
function extractImports(content: string): ImportSpec[] {
  const imports: ImportSpec[] = [];
  const importRegex = /@([a-zA-Z0-9_\-./~]+)(?![`\w])/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const path = match[1];
    if (path && !path.startsWith('ts-') && !path.startsWith('types/')) {
      imports.push({
        path: path,
        type: path.startsWith('http') ? 'url' : 'file',
        optional: false,
      });
    }
  }
  
  return imports;
}

/**
 * Parse markdown content into sections
 */
function parseMarkdownSections(content: string): MemorySection[] {
  const sections: MemorySection[] = [];
  const lines = content.split('\n');
  
  let currentSection: MemorySection | null = null;
  let contentLines: string[] = [];
  
  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headerMatch && headerMatch[1] && headerMatch[2]) {
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }
      
      currentSection = {
        title: headerMatch[2].trim(),
        content: '',
        level: headerMatch[1].length,
      };
      contentLines = [];
    } else {
      contentLines.push(line);
    }
  }
  
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Determine scope from file path
 */
function determineScope(sourceFile?: string): ScopeLevel {
  if (!sourceFile) return 'project';
  
  if (sourceFile.includes('/etc/') || sourceFile.includes('/Library/Application Support/')) {
    return 'system';
  }
  if (sourceFile.includes('/.claude/') && sourceFile.includes(process.env.HOME ?? '~')) {
    return 'user';
  }
  if (sourceFile.endsWith('.local.md')) {
    return 'local';
  }
  return 'project';
}

/**
 * Infer capabilities from content
 */
function inferCapabilities(content: string) {
  const caps = createDefaultCapabilities();
  const lowerContent = content.toLowerCase();
  
  if (/\b(npm|yarn|pnpm|bun|pip|cargo|make|bash|shell|terminal)\b/.test(lowerContent)) {
    caps.needsShell = true;
  }
  if (/\b(git|commit|branch|merge|pull|push)\b/.test(lowerContent)) {
    caps.needsGit = true;
  }
  if (/\b(api|http|fetch|request|endpoint|url)\b/.test(lowerContent)) {
    caps.needsNetwork = true;
  }
  if (/\b(document|readme|jsdoc|tsdoc|comment)\b/.test(lowerContent)) {
    caps.providesDocumentation = true;
  }
  if (/\b(test|spec|jest|vitest|mocha|pytest)\b/.test(lowerContent)) {
    caps.providesAnalysis = true;
  }
  
  return caps;
}

/**
 * Parse Claude memory file into ComponentSpec
 */
export function parseClaudeMemory(
  content: string,
  context?: ClaudeMemoryParseContext
): ParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  if (!content.trim()) {
    return {
      success: false,
      errors: ['Empty content'],
      warnings: [],
    };
  }
  
  // Check for YAML frontmatter (used in .claude/rules/)
  let frontmatter: Record<string, unknown> = {};
  let body = content;
  
  if (content.startsWith('---')) {
    try {
      const parsed = matter(content);
      frontmatter = parsed.data as Record<string, unknown>;
      body = parsed.content;
    } catch {
      warnings.push('Failed to parse YAML frontmatter');
    }
  }
  
  const imports = extractImports(body);
  const sections = parseMarkdownSections(body);
  const scope = determineScope(context?.sourceFile);
  const capabilities = inferCapabilities(body);
  
  // Determine ID
  let id = 'claude-md';
  if (context?.sourceFile) {
    const match = context.sourceFile.match(/([^/\\]+)\.md$/i);
    if (match && match[1]) {
      id = match[1].toLowerCase().replace(/\s+/g, '-');
    }
  }
  
  // Extract paths from frontmatter (for rules)
  const paths = frontmatter.paths as string[] | undefined;
  
  // Generate summary
  let summary = 'Claude Code project context';
  if (sections.length > 0 && sections[0]) {
    summary = sections[0].title;
  }
  if (frontmatter.description) {
    summary = String(frontmatter.description);
  }
  
  const spec: ComponentSpec = {
    id,
    version: DEFAULT_VERSION,
    sourceAgent: { id: 'claude' as AgentId },
    componentType: paths ? 'rule' : 'memory',
    category: ['context', 'instructions'],
    intent: {
      summary,
      purpose: 'Provide project context and instructions to Claude Code',
      whenToUse: paths ? `When working with files matching: ${paths.join(', ')}` : 'Always loaded',
    },
    activation: {
      mode: paths ? 'contextual' : 'auto',
      safetyLevel: 'safe',
      triggers: paths ? paths.map(p => ({ type: 'glob' as const, pattern: p })) : undefined,
    },
    invocation: {
      userInvocable: false,
    },
    execution: {
      context: 'main',
    },
    body,
    capabilities,
    metadata: {
      sourceFile: context?.sourceFile,
      originalFormat: 'claude.md',
    },
  };
  
  // Add memory-specific metadata
  const extendedSpec = spec as ComponentSpec & { 
    memorySpec?: { imports: ImportSpec[]; scope: ScopeLevel; hierarchical: boolean; sections: MemorySection[] };
    ruleActivation?: { paths: string[]; alwaysApply: boolean; agentDecided: boolean; scope: ScopeLevel };
  };
  
  extendedSpec.memorySpec = {
    imports,
    scope,
    hierarchical: true,
    sections,
  };
  
  if (paths) {
    extendedSpec.ruleActivation = {
      paths,
      alwaysApply: !paths || paths.length === 0,
      agentDecided: false,
      scope,
    };
  }
  
  if (imports.length > 0) {
    warnings.push(`Found ${imports.length} @imports that may need resolution`);
  }
  
  return {
    success: true,
    spec,
    errors,
    warnings,
  };
}

/**
 * Claude Memory Parser class
 */
export class ClaudeMemoryParser {
  readonly agentId: AgentId = 'claude';
  readonly supportedTypes = ['memory', 'rule'] as const;
  
  canParse(content: string, context?: ClaudeMemoryParseContext): boolean {
    return isClaudeMemory(content, context);
  }
  
  parse(content: string, context?: ClaudeMemoryParseContext): ParseResult {
    return parseClaudeMemory(content, context);
  }
}
