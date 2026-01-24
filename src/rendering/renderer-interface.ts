/**
 * Renderer interface and base implementation
 */

import type { AgentId, ComponentSpec, RenderResult, ConversionReport } from '../core/types.js';

export interface RenderOptions {
  includeComments?: boolean;
  preserveOriginalMetadata?: boolean;
  targetVersion?: string;
}

export interface AgentRenderer {
  readonly agentId: AgentId;

  render(spec: ComponentSpec, options?: RenderOptions): RenderResult;

  getTargetFilename(spec: ComponentSpec): string;

  getTargetDirectory(spec: ComponentSpec): string;
}

export abstract class BaseRenderer implements AgentRenderer {
  abstract readonly agentId: AgentId;

  abstract render(spec: ComponentSpec, options?: RenderOptions): RenderResult;

  abstract getTargetFilename(spec: ComponentSpec): string;

  abstract getTargetDirectory(spec: ComponentSpec): string;

  protected createErrorResult(errors: string[]): RenderResult {
    return {
      success: false,
      errors,
    };
  }

  protected createSuccessResult(
    content: string,
    filename: string,
    report: ConversionReport
  ): RenderResult {
    return {
      success: true,
      content,
      filename,
      errors: [],
      report,
    };
  }

  protected createConversionReport(
    spec: ComponentSpec,
    targetAgent: AgentId,
    startTime: number
  ): Omit<ConversionReport, 'preservedSemantics' | 'losses' | 'warnings' | 'suggestions' | 'fidelityScore'> {
    return {
      source: {
        agent: spec.sourceAgent?.id ?? 'claude',
        componentType: spec.componentType,
        id: spec.id,
      },
      target: {
        agent: targetAgent,
        componentType: this.mapComponentType(spec.componentType, targetAgent),
        id: spec.id,
      },
      convertedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  protected mapComponentType(
    sourceType: ComponentSpec['componentType'],
    _targetAgent: AgentId
  ): ComponentSpec['componentType'] {
    // Default mapping - subclasses can override
    const mappings: Record<string, ComponentSpec['componentType']> = {
      skill: 'skill',
      workflow: 'workflow',
      command: 'command',
    };
    return mappings[sourceType] ?? sourceType;
  }
}
