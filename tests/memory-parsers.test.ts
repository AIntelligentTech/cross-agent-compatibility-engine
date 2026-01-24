/**
 * Tests for memory file parsers
 */

import { describe, it, expect } from 'vitest';
import { UniversalMemoryParser, parseUniversalMemory, isAgentsMd } from '../src/parsing/memory/universal-memory-parser.js';
import { ClaudeMemoryParser, parseClaudeMemory, isClaudeMemory } from '../src/parsing/memory/claude-memory-parser.js';
import { AgentsMdRenderer, renderAgentsMd } from '../src/rendering/memory/agents-md-renderer.js';

describe('Universal Memory Parser (AGENTS.md)', () => {
  const parser = new UniversalMemoryParser();
  
  describe('isAgentsMd detection', () => {
    it('should detect AGENTS.md by filename', () => {
      expect(isAgentsMd('# Project', { sourceFile: 'AGENTS.md' })).toBe(true);
      expect(isAgentsMd('# Project', { sourceFile: '/path/to/AGENTS.md' })).toBe(true);
    });
    
    it('should detect AGENTS.md by content patterns', () => {
      const content = `# AGENTS.md
## Setup commands
- Install deps: \`pnpm install\`
## Code style
- TypeScript strict mode`;
      expect(isAgentsMd(content)).toBe(true);
    });
    
    it('should detect by setup and code style sections', () => {
      const content = `## Setup
Run \`npm install\`
## Code Style
Use TypeScript`;
      expect(isAgentsMd(content)).toBe(true);
    });
  });
  
  describe('parseUniversalMemory', () => {
    it('should parse basic AGENTS.md content', () => {
      const content = `# Project Instructions

This is a TypeScript project.

## Setup
- Run \`pnpm install\`
- Run \`pnpm dev\`

## Code Style
- Use TypeScript strict mode
- Prefer functional patterns`;
      
      const result = parseUniversalMemory(content, { sourceFile: 'AGENTS.md' });
      
      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec?.componentType).toBe('memory');
      expect(result.spec?.sourceAgent?.id).toBe('universal');
      expect(result.spec?.body).toBe(content);
    });
    
    it('should extract sections from content', () => {
      const content = `# Main Title
Intro text

## Section One
Content one

## Section Two
Content two`;
      
      const result = parseUniversalMemory(content);
      
      expect(result.success).toBe(true);
      const memorySpec = (result.spec as any).memorySpec;
      expect(memorySpec.sections).toHaveLength(3);
      expect(memorySpec.sections[0].title).toBe('Main Title');
      expect(memorySpec.sections[1].title).toBe('Section One');
    });
    
    it('should infer capabilities from content', () => {
      const content = `# Project
## Commands
- Run \`npm test\` for testing
- Run \`git push\` to deploy`;
      
      const result = parseUniversalMemory(content);
      
      expect(result.success).toBe(true);
      expect(result.spec?.capabilities.needsShell).toBe(true);
      expect(result.spec?.capabilities.needsGit).toBe(true);
    });
    
    it('should handle empty content', () => {
      const result = parseUniversalMemory('');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Empty content');
    });
  });
  
  describe('UniversalMemoryParser class', () => {
    it('should have correct agentId', () => {
      expect(parser.agentId).toBe('universal');
    });
    
    it('should support memory type', () => {
      expect(parser.supportedTypes).toContain('memory');
    });
    
    it('should parse via class method', () => {
      const result = parser.parse('# Test\nContent', { sourceFile: 'AGENTS.md' });
      expect(result.success).toBe(true);
    });
  });
});

describe('Claude Memory Parser (CLAUDE.md)', () => {
  const parser = new ClaudeMemoryParser();
  
  describe('isClaudeMemory detection', () => {
    it('should detect CLAUDE.md by filename', () => {
      expect(isClaudeMemory('# Project', { sourceFile: 'CLAUDE.md' })).toBe(true);
      expect(isClaudeMemory('# Project', { sourceFile: 'CLAUDE.local.md' })).toBe(true);
      expect(isClaudeMemory('# Project', { sourceFile: '.claude/rules/testing.md' })).toBe(true);
    });
    
    it('should detect Claude content by header', () => {
      expect(isClaudeMemory('# CLAUDE\nInstructions here')).toBe(true);
    });
    
    it('should detect Claude content by @imports', () => {
      expect(isClaudeMemory('See @README for details')).toBe(true);
    });
  });
  
  describe('parseClaudeMemory', () => {
    it('should parse basic CLAUDE.md content', () => {
      const content = `# Project Instructions

This is a TypeScript project.

## Build Commands
- \`pnpm install\`
- \`pnpm build\``;
      
      const result = parseClaudeMemory(content, { sourceFile: 'CLAUDE.md' });
      
      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec?.componentType).toBe('memory');
      expect(result.spec?.sourceAgent?.id).toBe('claude');
    });
    
    it('should extract @imports', () => {
      const content = `# Project
See @README for overview.
Check @docs/architecture.md for details.
Use @package.json for scripts.`;
      
      const result = parseClaudeMemory(content);
      
      expect(result.success).toBe(true);
      const memorySpec = (result.spec as any).memorySpec;
      expect(memorySpec.imports).toHaveLength(3);
      expect(memorySpec.imports[0].path).toBe('README');
      expect(memorySpec.imports[1].path).toBe('docs/architecture.md');
    });
    
    it('should parse rules with YAML frontmatter', () => {
      const content = `---
paths:
  - "src/**/*.ts"
  - "lib/**/*.ts"
---
# TypeScript Rules

- Use strict mode
- No any types`;
      
      const result = parseClaudeMemory(content, { sourceFile: '.claude/rules/typescript.md' });
      
      expect(result.success).toBe(true);
      expect(result.spec?.componentType).toBe('rule');
      expect(result.spec?.activation.triggers).toHaveLength(2);
      expect(result.spec?.activation.triggers?.[0].pattern).toBe('src/**/*.ts');
    });
    
    it('should determine scope from file path', () => {
      const content = '# Rules';
      
      const projectResult = parseClaudeMemory(content, { sourceFile: '/project/CLAUDE.md' });
      expect((projectResult.spec as any).memorySpec.scope).toBe('project');
      
      const localResult = parseClaudeMemory(content, { sourceFile: '/project/CLAUDE.local.md' });
      expect((localResult.spec as any).memorySpec.scope).toBe('local');
    });
    
    it('should warn about unresolved imports', () => {
      const content = 'See @README and @docs/guide.md';
      const result = parseClaudeMemory(content);
      
      expect(result.warnings.some(w => w.includes('@imports'))).toBe(true);
    });
  });
  
  describe('ClaudeMemoryParser class', () => {
    it('should have correct agentId', () => {
      expect(parser.agentId).toBe('claude');
    });
    
    it('should support memory and rule types', () => {
      expect(parser.supportedTypes).toContain('memory');
      expect(parser.supportedTypes).toContain('rule');
    });
  });
});

describe('AGENTS.md Renderer', () => {
  const renderer = new AgentsMdRenderer();
  
  describe('renderAgentsMd', () => {
    it('should render ComponentSpec to AGENTS.md', () => {
      const spec = {
        id: 'test-memory',
        version: { major: 1, minor: 0, patch: 0 },
        sourceAgent: { id: 'claude' as const },
        componentType: 'memory' as const,
        intent: {
          summary: 'Test project instructions',
          purpose: 'Provide context',
        },
        activation: { mode: 'auto' as const, safetyLevel: 'safe' as const },
        invocation: { userInvocable: false },
        execution: { context: 'main' as const },
        body: '# Project\n\nThis is the content.',
        capabilities: {
          needsShell: false,
          needsFilesystem: true,
          needsNetwork: false,
          needsGit: false,
          needsCodeSearch: false,
          needsBrowser: false,
          providesAnalysis: false,
          providesCodeGeneration: false,
          providesRefactoring: false,
          providesDocumentation: false,
        },
        metadata: {},
      };
      
      const result = renderAgentsMd(spec);
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('# Project\n\nThis is the content.');
      expect(result.filename).toBe('AGENTS.md');
      expect(result.report?.fidelityScore).toBeGreaterThanOrEqual(90);
    });
    
    it('should warn about unresolved imports', () => {
      const spec = {
        id: 'test-memory',
        version: { major: 1, minor: 0, patch: 0 },
        sourceAgent: { id: 'claude' as const },
        componentType: 'memory' as const,
        intent: { summary: 'Test', purpose: 'Test' },
        activation: { mode: 'auto' as const, safetyLevel: 'safe' as const },
        invocation: { userInvocable: false },
        execution: { context: 'main' as const },
        body: '# Project',
        capabilities: {
          needsShell: false,
          needsFilesystem: true,
          needsNetwork: false,
          needsGit: false,
          needsCodeSearch: false,
          needsBrowser: false,
          providesAnalysis: false,
          providesCodeGeneration: false,
          providesRefactoring: false,
          providesDocumentation: false,
        },
        metadata: {},
        memorySpec: {
          imports: [
            { path: 'README', type: 'file' as const },
            { path: 'docs/guide.md', type: 'file' as const },
          ],
          scope: 'project' as const,
          hierarchical: true,
        },
      };
      
      const result = renderAgentsMd(spec as any);
      
      expect(result.success).toBe(true);
      expect(result.report?.losses.some(l => l.description.includes('@imports'))).toBe(true);
      expect(result.content).toContain('<!-- Note:');
    });
  });
  
  describe('AgentsMdRenderer class', () => {
    it('should have correct agentId', () => {
      expect(renderer.agentId).toBe('universal');
    });
    
    it('should return AGENTS.md as output path', () => {
      expect(renderer.getOutputPath({} as any)).toBe('AGENTS.md');
    });
  });
});

describe('Round-trip conversion', () => {
  it('should convert AGENTS.md → Claude → AGENTS.md with high fidelity', () => {
    const originalContent = `# Project Instructions

This is a TypeScript project using pnpm.

## Setup
- Run \`pnpm install\`
- Run \`pnpm dev\`

## Code Style
- Use TypeScript strict mode
- Prefer functional patterns
- No any types`;
    
    // Parse as AGENTS.md
    const parseResult = parseUniversalMemory(originalContent, { sourceFile: 'AGENTS.md' });
    expect(parseResult.success).toBe(true);
    
    // Render back to AGENTS.md
    const renderResult = renderAgentsMd(parseResult.spec!);
    expect(renderResult.success).toBe(true);
    
    // Content should be preserved
    expect(renderResult.content).toBe(originalContent);
    expect(renderResult.report?.fidelityScore).toBeGreaterThanOrEqual(90);
  });
  
  it('should convert CLAUDE.md → AGENTS.md with import warnings', () => {
    const claudeContent = `# Project

See @README for overview.
Check @docs/guide.md for architecture.

## Build
Run \`pnpm build\``;
    
    // Parse as CLAUDE.md
    const parseResult = parseClaudeMemory(claudeContent, { sourceFile: 'CLAUDE.md' });
    expect(parseResult.success).toBe(true);
    
    // Render to AGENTS.md
    const renderResult = renderAgentsMd(parseResult.spec!);
    expect(renderResult.success).toBe(true);
    
    // Should have warnings about imports
    expect(renderResult.report?.losses.length).toBeGreaterThan(0);
  });
});
