/**
 * Renderer for Windsurf (Cascade) workflows
 */

import type { ComponentSpec, ConversionReport, ConversionLoss, ConversionWarning } from '../core/types.js';
import { BaseRenderer, type RenderOptions } from './renderer-interface.js';

export class WindsurfRenderer extends BaseRenderer {
  readonly agentId = 'windsurf' as const;

  render(spec: ComponentSpec, options?: RenderOptions): ReturnType<typeof this.createSuccessResult> | ReturnType<typeof this.createErrorResult> {
    const startTime = Date.now();
    const losses: ConversionLoss[] = [];
    const warnings: ConversionWarning[] = [];
    const preservedSemantics: string[] = [];
    const suggestions: string[] = [];

    // Build frontmatter
    const frontmatter: Record<string, unknown> = {
      description: spec.intent.summary,
    };

    // Map activation mode to auto_execution_mode
    const autoExecutionMode = this.mapActivationMode(spec.activation.mode);
    if (autoExecutionMode > 0) {
      frontmatter['auto_execution_mode'] = autoExecutionMode;
    }
    preservedSemantics.push('Activation mode');

    // Add tags if present
    if (spec.category && spec.category.length > 0) {
      frontmatter['tags'] = spec.category;
      preservedSemantics.push('Category tags');
    }

    // Check for losses from source agent features
    if (spec.sourceAgent?.id === 'claude') {
      // Claude-specific features that don't map
      if (spec.execution.context === 'fork') {
        losses.push({
          category: 'execution',
          severity: 'warning',
          description: 'Claude "fork" context has no Windsurf equivalent',
          sourceField: 'execution.context',
          recommendation: 'Workflow will run in main context',
        });
      }

      if (spec.execution.subAgent) {
        losses.push({
          category: 'execution',
          severity: 'warning',
          description: `Sub-agent "${spec.execution.subAgent}" is Claude-specific`,
          sourceField: 'execution.subAgent',
          recommendation: 'Remove sub-agent reference or add as prose instruction',
        });
      }

      if (spec.execution.allowedTools && spec.execution.allowedTools.length > 0) {
        warnings.push({
          code: 'TOOL_RESTRICTION_LOST',
          message: 'Claude tool restrictions cannot be enforced in Windsurf',
          field: 'execution.allowedTools',
        });
        suggestions.push('Consider adding tool usage guidance in the workflow body');
      }

      if (spec.invocation.argumentHint) {
        warnings.push({
          code: 'ARGUMENT_HINT_DEGRADED',
          message: 'Claude argument hints become prose instructions in Windsurf',
          field: 'invocation.argumentHint',
        });
      }
    }

    // Handle agent-specific overrides
    if (spec.agentOverrides?.windsurf) {
      const override = spec.agentOverrides.windsurf;
      if (override.frontmatterOverrides) {
        Object.assign(frontmatter, override.frontmatterOverrides);
      }
    }

    // Build the output
    const frontmatterYaml = this.buildFrontmatter(frontmatter);
    let body = spec.body;

    // Transform Claude-specific syntax
    body = this.transformBody(body, spec);

    // Add prefix/suffix from overrides
    if (spec.agentOverrides?.windsurf?.bodyPrefix) {
      body = spec.agentOverrides.windsurf.bodyPrefix + '\n\n' + body;
    }
    if (spec.agentOverrides?.windsurf?.bodySuffix) {
      body = body + '\n\n' + spec.agentOverrides.windsurf.bodySuffix;
    }

    // Add conversion comment if requested
    let content = '';
    if (options?.includeComments) {
      content += `<!-- Converted from ${spec.sourceAgent?.id ?? 'unknown'} to Windsurf -->\n`;
      content += `<!-- Original: ${spec.metadata.sourceFile ?? 'unknown'} -->\n\n`;
    }

    content += frontmatterYaml + '\n' + body;

    // Calculate fidelity score
    const fidelityScore = this.calculateFidelity(losses, warnings);

    // Build report
    const report: ConversionReport = {
      ...this.createConversionReport(spec, 'windsurf', startTime),
      preservedSemantics,
      losses,
      warnings,
      suggestions,
      fidelityScore,
    };

    const filename = this.getTargetFilename(spec);
    return this.createSuccessResult(content.trim() + '\n', filename, report);
  }

  getTargetFilename(spec: ComponentSpec): string {
    return `${spec.id}.md`;
  }

  getTargetDirectory(spec: ComponentSpec): string {
    if (spec.componentType === 'rule') {
      return '.windsurf/rules';
    }
    return '.windsurf/workflows';
  }

  protected override mapComponentType(sourceType: ComponentSpec['componentType']): 'workflow' | 'rule' {
    if (sourceType === 'rule') return 'rule';
    return 'workflow';
  }

  private mapActivationMode(mode: ComponentSpec['activation']['mode']): number {
    switch (mode) {
      case 'manual': return 0;
      case 'suggested': return 1;
      case 'contextual': return 2;
      case 'auto': return 3;
      case 'hooked': return 0; // No direct equivalent
      default: return 0;
    }
  }

  private transformBody(body: string, spec: ComponentSpec): string {
    let transformed = body;

    // Transform Claude $ARGUMENTS placeholder to prose
    if (transformed.includes('$ARGUMENTS')) {
      transformed = transformed.replace(/\$ARGUMENTS/g, '<user-provided arguments>');
      if (spec.invocation.argumentHint) {
        // Add argument hint as a note
        transformed = `> **Arguments**: ${spec.invocation.argumentHint}\n\n` + transformed;
      }
    }

    // Transform Claude shell injection syntax !`command`
    transformed = transformed.replace(/!\`([^`]+)\`/g, '(run: `$1`)');

    return transformed;
  }

  private buildFrontmatter(data: Record<string, unknown>): string {
    const lines: string[] = ['---'];
    
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      } else if (typeof value === 'boolean') {
        lines.push(`${key}: ${value}`);
      } else if (typeof value === 'string') {
        if (value.includes(':') || value.includes('#') || value.includes('\n')) {
          lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    
    lines.push('---');
    return lines.join('\n');
  }

  private calculateFidelity(losses: ConversionLoss[], warnings: ConversionWarning[]): number {
    let score = 100;
    
    for (const loss of losses) {
      if (loss.severity === 'critical') score -= 20;
      else if (loss.severity === 'warning') score -= 10;
      else score -= 5;
    }
    
    for (const _warning of warnings) {
      score -= 3;
    }
    
    return Math.max(0, score);
  }
}
