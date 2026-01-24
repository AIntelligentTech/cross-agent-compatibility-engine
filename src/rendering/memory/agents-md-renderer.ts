/**
 * AGENTS.md Renderer - Renders ComponentSpec to universal AGENTS.md format
 * 
 * AGENTS.md is a cross-agent standard supported by 60k+ projects.
 */

import type { AgentId, ComponentSpec, RenderResult, ConversionReport } from '../../core/types.js';

export interface AgentsMdRenderOptions {
  outputPath?: string;
  includeMetadata?: boolean;
}

/**
 * Render ComponentSpec to AGENTS.md format
 */
export function renderAgentsMd(
  spec: ComponentSpec,
  options?: AgentsMdRenderOptions
): RenderResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const preservedSemantics: string[] = [];
  const losses: ConversionReport['losses'] = [];
  
  // AGENTS.md is plain markdown, no frontmatter
  let content = '';
  
  // If we have the original body, use it
  if (spec.body) {
    content = spec.body;
    preservedSemantics.push('body content');
  } else {
    // Generate from spec
    content = `# ${spec.intent.summary}\n\n`;
    
    if (spec.intent.purpose) {
      content += `${spec.intent.purpose}\n\n`;
    }
  }
  
  // Check for imports that need to be inlined
  const extendedSpec = spec as ComponentSpec & { 
    memorySpec?: { imports?: Array<{ path: string; resolved?: string }> } 
  };
  
  if (extendedSpec.memorySpec?.imports && extendedSpec.memorySpec.imports.length > 0) {
    const unresolvedImports = extendedSpec.memorySpec.imports.filter(i => !i.resolved);
    if (unresolvedImports.length > 0) {
      losses.push({
        category: 'content',
        severity: 'warning',
        description: `${unresolvedImports.length} @imports cannot be converted (AGENTS.md doesn't support imports)`,
        sourceField: 'memorySpec.imports',
        recommendation: 'Inline the imported content manually',
      });
      
      // Add comment about imports
      content += `\n<!-- Note: The following imports from the source file need manual resolution:\n`;
      for (const imp of unresolvedImports) {
        content += `  @${imp.path}\n`;
      }
      content += `-->\n`;
    }
  }
  
  // Calculate fidelity
  let fidelityScore = 95; // AGENTS.md is very compatible
  fidelityScore -= losses.length * 5;
  fidelityScore = Math.max(0, Math.min(100, fidelityScore));
  
  preservedSemantics.push('markdown structure', 'sections', 'instructions');
  
  const report: ConversionReport = {
    source: {
      agent: spec.sourceAgent?.id ?? 'universal',
      componentType: spec.componentType,
      id: spec.id,
    },
    target: {
      agent: 'universal',
      componentType: 'memory',
      id: spec.id,
    },
    preservedSemantics,
    losses,
    warnings: warnings.map(w => ({ code: 'WARN', message: w })),
    suggestions: losses.length > 0 ? ['Review and inline any @imports manually'] : [],
    fidelityScore,
    convertedAt: new Date().toISOString(),
    durationMs: 0,
  };
  
  return {
    success: true,
    content,
    filename: options?.outputPath ?? 'AGENTS.md',
    errors,
    report,
  };
}

/**
 * AGENTS.md Renderer class
 */
export class AgentsMdRenderer {
  readonly agentId: AgentId = 'universal';
  readonly supportedTypes = ['memory'] as const;
  
  render(spec: ComponentSpec, options?: AgentsMdRenderOptions): RenderResult {
    return renderAgentsMd(spec, options);
  }
  
  getOutputPath(_spec: ComponentSpec): string {
    return 'AGENTS.md';
  }
}
