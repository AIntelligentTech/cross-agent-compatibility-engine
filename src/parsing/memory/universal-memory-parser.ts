/**
 * Universal Memory Parser - Parses AGENTS.md files
 * 
 * AGENTS.md is a cross-agent standard for providing context to AI coding assistants.
 * It's plain markdown without frontmatter, designed to work across all agents.
 */

import type { AgentId, ComponentSpec, ParseResult, MemorySection } from '../../core/types.js';
import { DEFAULT_VERSION } from '../../core/constants.js';
import { createDefaultCapabilities } from '../../core/types.js';

export interface UniversalMemoryParseContext {
  sourceFile?: string;
  sourcePath?: string;
}

/**
 * Detect if content is an AGENTS.md file
 */
export function isAgentsMd(content: string, context?: UniversalMemoryParseContext): boolean {
  // Check filename
  if (context?.sourceFile?.endsWith('AGENTS.md')) {
    return true;
  }
  
  // Check for common AGENTS.md patterns
  const hasAgentsHeader = /^#\s*AGENTS\.md/im.test(content);
  const hasSetupSection = /^##?\s*(Setup|Build|Install)/im.test(content);
  const hasCodeStyleSection = /^##?\s*(Code\s*Style|Coding\s*Style|Style\s*Guide)/im.test(content);
  
  return hasAgentsHeader || (hasSetupSection && hasCodeStyleSection);
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
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }
      
      // Start new section
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
  
  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Extract summary from AGENTS.md content
 */
function extractSummary(content: string, sections: MemorySection[]): string {
  // Look for a description in the first paragraph or first section
  const firstParagraph = content.split(/\n\n/)[0]?.trim();
  
  if (firstParagraph && !firstParagraph.startsWith('#')) {
    return firstParagraph.slice(0, 200);
  }
  
  // Use first section title
  if (sections.length > 0) {
    return `Project instructions: ${sections.map(s => s.title).slice(0, 3).join(', ')}`;
  }
  
  return 'Project context and instructions';
}

/**
 * Infer capabilities from AGENTS.md content
 */
function inferCapabilities(content: string) {
  const caps = createDefaultCapabilities();
  const lowerContent = content.toLowerCase();
  
  // Check for shell/command mentions
  if (/\b(npm|yarn|pnpm|bun|pip|cargo|make|bash|shell|terminal)\b/.test(lowerContent)) {
    caps.needsShell = true;
  }
  
  // Check for git mentions
  if (/\b(git|commit|branch|merge|pull|push)\b/.test(lowerContent)) {
    caps.needsGit = true;
  }
  
  // Check for network/API mentions
  if (/\b(api|http|fetch|request|endpoint|url)\b/.test(lowerContent)) {
    caps.needsNetwork = true;
  }
  
  // Check for documentation mentions
  if (/\b(document|readme|jsdoc|tsdoc|comment)\b/.test(lowerContent)) {
    caps.providesDocumentation = true;
  }
  
  // Check for testing mentions
  if (/\b(test|spec|jest|vitest|mocha|pytest)\b/.test(lowerContent)) {
    caps.providesAnalysis = true;
  }
  
  return caps;
}

/**
 * Parse AGENTS.md content into ComponentSpec
 */
export function parseUniversalMemory(
  content: string,
  context?: UniversalMemoryParseContext
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
  
  const sections = parseMarkdownSections(content);
  const summary = extractSummary(content, sections);
  const capabilities = inferCapabilities(content);
  
  // Determine ID from filename or generate one
  let id = 'agents-md';
  if (context?.sourceFile) {
    const match = context.sourceFile.match(/([^/\\]+)\.md$/i);
    if (match && match[1]) {
      id = match[1].toLowerCase().replace(/\s+/g, '-');
    }
  }
  
  const spec: ComponentSpec = {
    id,
    version: DEFAULT_VERSION,
    sourceAgent: { id: 'universal' as AgentId },
    componentType: 'memory',
    category: ['context', 'instructions'],
    intent: {
      summary,
      purpose: 'Provide project context and instructions to AI coding assistants',
      whenToUse: 'Always loaded when working in this project',
    },
    activation: {
      mode: 'auto',
      safetyLevel: 'safe',
    },
    invocation: {
      userInvocable: false,
    },
    execution: {
      context: 'main',
    },
    body: content,
    capabilities,
    metadata: {
      sourceFile: context?.sourceFile,
      originalFormat: 'agents.md',
    },
  };
  
  // Add memory-specific metadata
  (spec as ComponentSpec & { memorySpec?: unknown }).memorySpec = {
    scope: 'project',
    hierarchical: true,
    sections,
  };
  
  return {
    success: true,
    spec,
    errors,
    warnings,
  };
}

/**
 * Universal Memory Parser class
 */
export class UniversalMemoryParser {
  readonly agentId: AgentId = 'universal';
  readonly supportedTypes = ['memory'] as const;
  
  canParse(content: string, context?: UniversalMemoryParseContext): boolean {
    return isAgentsMd(content, context);
  }
  
  parse(content: string, context?: UniversalMemoryParseContext): ParseResult {
    return parseUniversalMemory(content, context);
  }
}
